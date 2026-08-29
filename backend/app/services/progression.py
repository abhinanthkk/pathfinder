"""
Reusable progression service.

This module is the single source of truth for:

  * determining the current/active learning path for a user
  * automatically selecting the current step of a roadmap
  * unlocking dependents / respecting prerequisites
  * marking steps as complete or skipped (with all side effects)
  * computing progress stats (overall, milestone, current/upcoming)

All endpoints (dashboard, roadmap, progress, goals) should delegate to these
functions instead of re-implementing the logic.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user  # noqa: F401  (re-exported convenience)
from app.models.database import get_db  # noqa: F401
from app.models.models import (
    AdaptationEvent,
    LearningPath,
    PathNode,
    ProgressEvent,
    User,
    UserSkill,
    UserStreak,
)
from app.schemas.profile import (
    DayActivity,
    PathNodeResponse,
    ProgressOverviewResponse,
    ProgressResponse,
    SkillChange,
    StreakResponse,
)
from app.services.skill_graph import get_skill_graph

from app.api.streak import update_streak, _build_weekly_activity
from app.api.badges import check_and_award_badges
from app.api.skill_progress import recalculate_skill_progress


# ---------------------------------------------------------------------------
# Path selection
# ---------------------------------------------------------------------------
def get_active_path(db: Session, user_id: str, path_id: str | None = None) -> LearningPath | None:
    """Return the LearningPath. Prefers `path_id`, else the current role.

    When a `path_id` is explicitly provided, completed paths are also returned
    so a finished roadmap can still be viewed (progress / dashboard still work
    and show the completed state) instead of 404ing. When no `path_id` is given,
    only 'active' paths are candidates for the current role.
    """
    base = db.query(LearningPath).filter(LearningPath.user_id == user_id)
    if path_id:
        return base.filter(
            LearningPath.id == path_id,
            LearningPath.status.in_(("active", "completed")),
        ).first()
    base = base.filter(LearningPath.status == "active")
    path = base.filter(LearningPath.is_current.is_(True)).first()
    if path:
        return path
    path = base.order_by(LearningPath.created_at.asc()).first()
    if path:
        set_current_path(db, user_id, path.id)
    return path


def set_current_path(db: Session, user_id: str, path_id: str) -> LearningPath | None:
    """Make `path_id` the active/current role. Returns the path or None.

    Active and completed paths may be selected so a finished roadmap can still
    be viewed.
    """
    all_paths = (
        db.query(LearningPath)
        .filter(
            LearningPath.user_id == user_id,
            LearningPath.status.in_(("active", "completed")),
        )
        .all()
    )
    target = None
    for p in all_paths:
        if p.id == path_id:
            p.is_current = True
            target = p
        else:
            p.is_current = False
        db.add(p)
    db.commit()
    db.refresh(target) if target else None
    return target


def active_path_count(db: Session, user_id: str) -> int:
    return (
        db.query(LearningPath)
        .filter(LearningPath.user_id == user_id, LearningPath.status == "active")
        .count()
    )


def path_nodes(db: Session, path_id: str) -> list[PathNode]:
    return (
        db.query(PathNode)
        .filter(PathNode.path_id == path_id)
        .order_by(PathNode.milestone_number, PathNode.order_in_milestone)
        .all()
    )


def find_node(
    db: Session,
    path: LearningPath,
    node_id: str | None = None,
    resource_id: str | None = None,
) -> PathNode | None:
    if node_id:
        node = db.query(PathNode).filter(
            PathNode.id == node_id, PathNode.path_id == path.id
        ).first()
        if node:
            return node
    if resource_id:
        return db.query(PathNode).filter(
            PathNode.resource_id == resource_id, PathNode.path_id == path.id
        ).first()
    return None


# ---------------------------------------------------------------------------
# Current step selection
# ---------------------------------------------------------------------------
def select_current_step(db: Session, path: LearningPath) -> PathNode | None:
    """
    Ensure the roadmap has exactly one CURRENT step.

    Rules:
      1. If a valid node already carries status 'current', keep it.
      2. Otherwise select the earliest eligible (available / in_progress) node.
      3. If the whole roadmap is finished, mark the path completed.
    """
    if not path:
        return None
    nodes = path_nodes(db, path.id)
    if not nodes:
        return None

    ELIGIBLE = ("available", "in_progress", "current")

    # 1) Existing current still valid?
    for n in nodes:
        if n.status == "current":
            return n

    # 2) Earliest eligible node becomes current.
    chosen = next((n for n in nodes if n.status in ELIGIBLE), None)
    if chosen is not None:
        for n in nodes:
            if n.status == "current":
                n.status = "available"
        if chosen.status != "current":
            chosen.status = "current"
            db.add(chosen)
        # Normalise: no other node may stay 'in_progress'.
        db.commit()
        return chosen

    # 3) Finished? (every step either completed or skipped)
    if nodes and all(_terminal(n) for n in nodes):
        path.status = "completed"
        path.is_current = True
        db.add(path)
        db.commit()
    return None


# ---------------------------------------------------------------------------
# Unlocking dependents
# ---------------------------------------------------------------------------
def unlock_available_nodes(db: Session, path: LearningPath) -> bool:
    """
    Mark locked nodes as available once their prerequisites are satisfied.

    A node opens when EITHER:
      * every earlier step in its milestone (plus all previous milestones)
        is terminal (completed or skipped), OR
      * its skill-graph prerequisites are met by the user's current skills.
    """
    if not path:
        return False
    sg = get_skill_graph()
    nodes = path_nodes(db, path.id)
    if not nodes:
        return False

    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(UserSkill.user_id == path.user_id).all()
    }

    by_milestone: dict[int, list[PathNode]] = {}
    for n in nodes:
        by_milestone.setdefault(n.milestone_number, []).append(n)

    def milestone_terminal(m_num: int) -> bool:
        m_nodes = by_milestone.get(m_num, [])
        return bool(m_nodes) and all(
            x.status in ("completed", "skipped") for x in m_nodes
        )

    changed = False
    for n in nodes:
        if n.status in ("completed", "skipped", "available", "in_progress", "current"):
            continue
        if not n.status or n.status == "locked":
            pass

        # Linear sequencing gate: all previous steps in this milestone done AND
        # all earlier milestones terminal.
        prevs = [
            x
            for x in nodes
            if x.milestone_number == n.milestone_number
            and x.order_in_milestone < n.order_in_milestone
        ]
        earlier_milestones = [_ for _ in range(1, n.milestone_number)]
        linear_met = True
        if prevs and not all(x.status in ("completed", "skipped") for x in prevs):
            linear_met = False
        if linear_met and not all(milestone_terminal(m) for m in earlier_milestones):
            linear_met = False

        # Skill-graph prerequisite gate.
        resource = sg.get_resource(n.resource_id) if n.resource_id else None
        skill_met = False
        if resource:
            prereqs = resource.get("prerequisites", [])
            skill_met = all(user_skills.get(p, 0) >= 0.3 for p in prereqs)

        if linear_met or skill_met:
            n.status = "available"
            db.add(n)
            changed = True

    if changed:
        db.commit()
    return changed


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------
def milestone_stats(nodes: list[PathNode]) -> dict[int, dict]:
    ms: dict[int, dict] = {}
    for n in nodes:
        d = ms.setdefault(n.milestone_number, {
            "total": 0, "completed": 0, "skipped": 0,
            "done": False, "progress": 0.0,
        })
        d["total"] += 1
        if n.status == "completed":
            d["completed"] += 1
        elif n.status == "skipped":
            d["skipped"] += 1
    for d in ms.values():
        done = d["total"] > 0 and (d["completed"] + d["skipped"]) == d["total"]
        d["done"] = done
        d["progress"] = round((d["completed"] + d["skipped"]) / d["total"] * 100, 1) if d["total"] else 0.0
    return ms


def path_stats(nodes: list[PathNode], path_status: str = "active") -> dict:
    total = len(nodes)
    completed = sum(1 for n in nodes if n.status == "completed")
    skipped = sum(1 for n in nodes if n.status == "skipped")
    ms = milestone_stats(nodes)
    return {
        "total_steps": total,
        "completed_steps": completed,
        "skipped_steps": skipped,
        "overall_progress": round(completed / total, 2) if total else 0.0,
        "complete": total > 0 and (completed + skipped) == total,
        "completed_milestones": sum(1 for d in ms.values() if d["done"]),
        "total_milestones": len(ms),
        "milestones": ms,
        "path_status": path_status,
    }


def current_step_of(nodes: list[PathNode]) -> PathNode | None:
    """The ACTIVE/current node of a roadmap, falling back to the earliest eligible."""
    return next(
        (n for n in nodes if n.status == "current"),
        next((n for n in nodes if n.status in ("available", "in_progress")), None),
    )


# ---------------------------------------------------------------------------
# Step actions
# ---------------------------------------------------------------------------
def _apply_skill_confidence(
    db: Session,
    user: User,
    path: LearningPath,
    node: PathNode,
    delta: float,
) -> dict[str, SkillChange]:
    """Increase confidence for every skill a completed step teaches."""
    sg = get_skill_graph()
    resource = sg.get_resource(node.resource_id) if node.resource_id else None
    effective: list[str] = list(resource.get("skills", [])) if resource else []
    for s in node.skills or []:
        if s not in effective:
            effective.append(s)

    changes: dict[str, SkillChange] = {}
    for skill_id in effective:
        existing = (
            db.query(UserSkill)
            .filter(UserSkill.user_id == user.id, UserSkill.skill_id == skill_id)
            .first()
        )
        old = existing.confidence if existing else 0.0
        new = min(1.0, old + delta)
        if existing:
            existing.confidence = new
        else:
            db.add(UserSkill(user_id=user.id, skill_id=skill_id, confidence=new, source="assessment"))
        changes[skill_id] = SkillChange(old=round(old, 2), new=round(new, 2))
    return changes


def _record_adaptation(db, path, trigger, explanation, skill_changes=None, node=None):
    db.add(AdaptationEvent(
        user_id=path.user_id,
        path_id=path.id,
        trigger=trigger,
        explanation=explanation,
    ))


def _terminal(node) -> bool:
    return node.status in ("completed", "skipped")


def _verify_transition(node: PathNode, action: str) -> None:
    if node.status == "completed":
        raise HTTPException(status_code=409, detail="Step is already completed.")
    if node.status == "skipped":
        raise HTTPException(
            status_code=409,
            detail="Step was skipped and cannot be re-opened. Skill prerequisites may be missing.",
        )


def _advance_payload(db, user, path) -> dict:
    """
    Build the enriched one-call payload returned after a complete/skip action:
    the new current step, upcoming steps, overall progress and completion flag.
    """
    nodes = path_nodes(db, path.id)
    stats = path_stats(nodes, path.status)
    current = current_step_of(nodes)
    upcoming = []
    if current:
        for n in nodes:
            if n.id == current.id:
                continue
            if n.status in ("available", "in_progress"):
                upcoming.append(n)
            if len(upcoming) >= 5:
                break
    return {
        "path_id": path.id,
        "path_completed": stats["complete"],
        "overall_progress": stats["overall_progress"],
        "current_milestone": current.milestone_number if current else (
            stats["total_milestones"] if stats["complete"] else 0
        ),
        "current_step": build_node_response(current) if current else None,
        "upcoming_steps": build_node_list(upcoming),
    }


def _next_step_title(nodes: list[PathNode], current: PathNode | None) -> str:
    if not current:
        left = [n for n in nodes if n.status in ("available", "in_progress")]
        if left:
            return left[0].resource_title or "next module"
        return "the final milestone"
    return current.resource_title or "next module"


def mark_step_complete(db: Session, user: User, path: LearningPath, node: PathNode) -> ProgressResponse:
    _verify_transition(node, "complete")
    stats_before = path_stats(path_nodes(db, path.id))
    ms_before = stats_before["milestones"]

    old_status = node.status
    node.status = "completed"
    node.completed_at = datetime.now(timezone.utc)
    db.add(node)

    skill_changes = _apply_skill_confidence(db, user, path, node, 0.2)

    db.add(ProgressEvent(
        user_id=user.id,
        path_id=path.id,
        resource_id=node.resource_id,
        old_status=old_status,
        new_status="completed",
        skill_changes={k: {"old": v.old, "new": v.new} for k, v in skill_changes.items()},
    ))

    unlock_available_nodes(db, path)
    current = select_current_step(db, path)

    # Milestone just crossed?
    ms_after = path_stats(path_nodes(db, path.id))["milestones"]
    nodes = path_nodes(db, path.id)
    stats = path_stats(nodes)
    _record_adaptation(
        db, path, "course_completed",
        f"Completed '{node.resource_title or node.id}'. "
        f"Overall progress is now {round(stats['overall_progress'] * 100)}%. "
        f"Next up: {_next_step_title(nodes, current)}.",
    )

    # Streak + skill progress + badges (each commits internally).
    streak = update_streak(db, user.id)
    recalculate_skill_progress(db, user.id, path)
    new_badges = check_and_award_badges(db, user.id, path)

    streak_data = StreakResponse(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        last_activity_date=(
            streak.last_activity_date.isoformat() if streak.last_activity_date else None
        ),
        weekly_activity=_build_weekly_activity(db, user.id),
    ).model_dump()

    return ProgressResponse(
        updated_node=build_node_response(node),
        skill_changes=skill_changes,
        path_changed=True,
        adaptation={
            "trigger": "course_completed",
            "explanation": f"Roadmap updated. Next up: {_next_step_title(nodes, current)}.",
        },
        streak=streak_data,
        new_badges=[b.model_dump() for b in new_badges],
        milestone_completed=next(
            (num for num, d in ms_after.items() if d["done"] and not ms_before.get(num, {}).get("done")),
            None,
        ),
        **_advance_payload(db, user, path),
    )


def mark_step_skipped(db: Session, user: User, path: LearningPath, node: PathNode) -> ProgressResponse:
    _verify_transition(node, "skip")
    old_status = node.status
    node.status = "skipped"
    db.add(node)

    db.add(ProgressEvent(
        user_id=user.id,
        path_id=path.id,
        resource_id=node.resource_id,
        old_status=old_status,
        new_status="skipped",
        skill_changes={},
    ))

    skipped_prereq_note = ""
    sg = get_skill_graph()
    resource = sg.get_resource(node.resource_id) if node.resource_id else None
    if resource and resource.get("prerequisites"):
        skipped_prereq_note = " This topic is a prerequisite for later steps."

    unlock_available_nodes(db, path)
    current = select_current_step(db, path)
    nodes = path_nodes(db, path.id)

    next_title = _next_step_title(nodes, current)
    _record_adaptation(
        db, path, "step_skipped",
        f"You skipped '{node.resource_title or node.id}'.{skipped_prereq_note} "
        f"The next prerequisite-compatible module is '{next_title}'.",
    )

    # Skipped steps never count toward completion, so no streak bump.
    recalculate_skill_progress(db, user.id, path)
    new_badges = check_and_award_badges(db, user.id, path)

    return ProgressResponse(
        updated_node=build_node_response(node),
        skill_changes={},
        path_changed=True,
        adaptation={
            "trigger": "step_skipped",
            "explanation": f"You skipped '{node.resource_title or node.id}'. "
            f"The next prerequisite-compatible module is '{next_title}'.",
        },
        streak=None,
        new_badges=[b.model_dump() for b in new_badges],
        milestone_completed=None,
        **_advance_payload(db, user, path),
    )


# ---------------------------------------------------------------------------
# Response builder
# ---------------------------------------------------------------------------
def build_node_response(node: PathNode) -> PathNodeResponse:
    return PathNodeResponse(
        node_id=node.id,
        resource_id=node.resource_id,
        title=node.resource_title,
        description=node.description or "",
        status=node.status,
        estimated_hours=node.estimated_hours,
        milestone=node.milestone_number,
        order=node.order_in_milestone,
        skills=node.skills or [],
        resources=[
            {
                "title": r.get("title", ""),
                "type": r.get("type", "article"),
                "url": r.get("url", ""),
                "source": r.get("source", ""),
            }
            for r in (node.resources or [])
        ],
    )


def build_node_list(nodes: list[PathNode]) -> list[PathNodeResponse]:
    return [build_node_response(n) for n in nodes]


# ---------------------------------------------------------------------------
# Progress overview (used by the dedicated Progress page)
# ---------------------------------------------------------------------------
_MILESTONE_TITLES = [
    "Foundations",
    "Core Concepts",
    "Specialized Skills",
    "Integration & Advanced",
    "Capstone & Mastery",
]


def role_label_for(key: str) -> str:
    sg = get_skill_graph()
    goal = sg.goals.get(key)
    if goal:
        return goal.get("name") or key
    return key.replace("_", " ").title()


def milestone_title_for(number: int) -> str:
    if 1 <= number <= len(_MILESTONE_TITLES):
        return _MILESTONE_TITLES[number - 1]
    return f"Milestone {number}"


def build_progress_overview(
    db: Session,
    user_id: str,
    path: LearningPath,
) -> ProgressOverviewResponse:
    """
    Compose the full action-oriented progress payload for a single roadmap.
    Completed/skipped steps are returned (hidden by default in the UI) so the
    Progress page can render collapsed history without extra round-trips.
    """
    select_current_step(db, path)
    nodes = path_nodes(db, path.id)
    stats = path_stats(nodes, path.status)

    current = current_step_of(nodes)
    upcoming = []
    for n in nodes:
        if n.id == (current.id if current else None):
            continue
        if n.status in ("available", "in_progress"):
            upcoming.append(n)
        if len(upcoming) >= 6:
            break

    completed = [n for n in nodes if n.status == "completed"]
    skipped = [n for n in nodes if n.status == "skipped"]

    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    streak_resp = StreakResponse(
        current_streak=streak.current_streak if streak else 0,
        longest_streak=streak.longest_streak if streak else 0,
        last_activity_date=(
            streak.last_activity_date.isoformat() if streak and streak.last_activity_date else None
        ),
        weekly_activity=_build_weekly_activity(db, user_id),
    )

    adaptations = (
        db.query(AdaptationEvent)
        .filter(AdaptationEvent.user_id == user_id, AdaptationEvent.path_id == path.id)
        .order_by(AdaptationEvent.created_at.desc())
        .limit(3)
        .all()
    )

    return ProgressOverviewResponse(
        path_id=path.id,
        target_role=path.target_role,
        role_label=role_label_for(path.target_role),
        path_completed=stats["complete"],
        overall_progress=stats["overall_progress"],
        current_milestone=current.milestone_number if current else (
            stats["total_milestones"] if stats["complete"] else 0
        ),
        current_milestone_title=milestone_title_for(
            current.milestone_number if current else stats["total_milestones"]
        ),
        current_step=build_node_response(current) if current else None,
        upcoming_steps=build_node_list(upcoming),
        completed_count=len(completed),
        completed_steps=build_node_list(completed),
        skipped_count=len(skipped),
        skipped_steps=build_node_list(skipped),
        total_steps=stats["total_steps"],
        estimated_completion=(
            path.estimated_completion_date.strftime("%Y-%m-%d")
            if path.estimated_completion_date
            else None
        ),
        streak=streak_resp,
        recent_adaptations=[
            {
                "trigger": a.trigger,
                "explanation": a.explanation,
                "created_at": a.created_at.isoformat() if a.created_at else "",
            }
            for a in adaptations
        ],
    )