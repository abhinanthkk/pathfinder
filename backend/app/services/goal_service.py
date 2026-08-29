"""
Goal / learning-role service.

Owns the lifecycle of a user's learning goals (active learning paths):

  * resolve a requested role to a canonical key (predefined or custom)
  * create-or-update the roadmap for a role WITHOUT touching the other role
  * enforce a maximum of MAX_ACTIVE_PATHS active roles
  * compute per-role progress summaries
  * report onboarding status
"""
from __future__ import annotations

import logging
import math
import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.models import (
    GeneratedRoadmap,
    LearnerProfile,
    LearningPath,
    PathNode,
    User,
    UserSkill,
)
from app.schemas.profile import (
    GoalCreate,
    GoalsResponse,
    OnboardingStatusResponse,
    PathNodeResponse,
    PathResponse,
    PathSummary,
)
from app.services.path_generator import generate_learning_path, MILESTONE_TITLES
from app.services.progression import (
    MAX_ACTIVE_PATHS,
    active_path_count,
    path_nodes,
    path_stats,
    select_current_step,
)
from app.services.skill_graph import get_skill_graph

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Role helpers
# ---------------------------------------------------------------------------
def _slug(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_") or "learning_goal"


def role_key(target_role: str = "", goal: str = "") -> tuple[str, bool]:
    """Resolve a request to (canonical_role_key, is_custom)."""
    sg = get_skill_graph()
    for candidate in (target_role, goal, goal or target_role):
        if not candidate:
            continue
        resolved = sg.resolve_goal_role(candidate)
        if resolved:
            return resolved, False
    base = target_role or goal or "learning_goal"
    return _slug(base), True


def role_display(target_role: str) -> str:
    sg = get_skill_graph()
    goal = sg.goals.get(target_role)
    if goal:
        return goal.get("name") or target_role
    return target_role.replace("_", " ").title()


def milestone_title(number: int) -> str:
    if 1 <= number <= len(MILESTONE_TITLES):
        return MILESTONE_TITLES[number - 1]
    return f"Milestone {number}"


# ---------------------------------------------------------------------------
# Profile / skills persistence
# ---------------------------------------------------------------------------
def _get_or_create_profile(db: Session, user_id: str) -> LearnerProfile:
    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        profile = LearnerProfile(user_id=user_id)
        db.add(profile)
        db.flush()
    return profile


def _apply_request_metadata(db: Session, user: User, data: GoalCreate, key: str, is_custom: bool):
    sg = get_skill_graph()
    profile = _get_or_create_profile(db, user.id)
    if data.experience_level:
        profile.experience_level = data.experience_level
    if data.weekly_hours:
        profile.weekly_hours = data.weekly_hours
    if data.preferred_learning_style:
        profile.preferred_learning_style = data.preferred_learning_style
    display = data.goal or role_display(key)
    profile.goal = display
    profile.target_role = key
    profile.onboarding_complete = True
    db.add(profile)

    for skill_id, confidence in (data.skills or {}).items():
        existing = (
            db.query(UserSkill)
            .filter(UserSkill.user_id == user.id, UserSkill.skill_id == skill_id)
            .first()
        )
        if existing:
            existing.confidence = float(confidence)
        else:
            db.add(UserSkill(
                user_id=user.id,
                skill_id=skill_id,
                confidence=float(confidence),
                source="goal_create",
            ))
    db.commit()


def _existing_path_for_role(db: Session, user_id: str, key: str) -> LearningPath | None:
    return (
        db.query(LearningPath)
        .filter(
            LearningPath.user_id == user_id,
            LearningPath.status == "active",
            LearningPath.target_role == key,
        )
        .first()
    )


# ---------------------------------------------------------------------------
# AI roadmap persistence (custom roles)
# ---------------------------------------------------------------------------
def save_ai_roadmap(
    db: Session,
    user: User,
    key: str,
    goal_label: str,
    roadmap: dict,
    weekly_hours: float,
) -> tuple[str, PathResponse]:
    """
    Persist an AI-generated roadmap for `key`.

    If the user already has an active path for this role it is refreshed in
    place; otherwise a new path is created (enforcing MAX_ACTIVE_PATHS).
    """
    existing_path = _existing_path_for_role(db, user.id, key)
    if not existing_path and active_path_count(db, user.id) >= MAX_ACTIVE_PATHS:
        raise HTTPException(
            status_code=400,
            detail="You currently have 2 active learning paths.",
        )

    # Raw roadmap cache
    existing_gr = (
        db.query(GeneratedRoadmap)
        .filter(GeneratedRoadmap.user_id == user.id)
        .first()
    )
    if existing_gr:
        existing_gr.goal = goal_label
        existing_gr.roadmap_data = roadmap
    else:
        db.add(GeneratedRoadmap(user_id=user.id, goal=goal_label, roadmap_data=roadmap))
    db.flush()

    now = datetime.now(timezone.utc)
    total_hours = sum(
        s.get("estimated_hours", 5)
        for m in roadmap.get("milestones", [])
        for s in m.get("steps", [])
    )
    weekly = weekly_hours or 5.0
    total_weeks = sum(
        math.ceil(
            sum(s.get("estimated_hours", 5) for s in m.get("steps", [])) / weekly
        )
        for m in roadmap.get("milestones", [])
    )
    completion_date = now + timedelta(weeks=total_weeks)

    if existing_path:
        lp = existing_path
        db.query(PathNode).filter(PathNode.path_id == lp.id).delete()
    else:
        lp = LearningPath(user_id=user.id, status="active")
        db.add(lp)
    lp.target_role = key
    lp.is_custom = True
    lp.is_current = True
    lp.status = "active"
    lp.profile_signature = "ai_generated"
    lp.total_estimated_hours = total_hours
    lp.total_estimated_weeks = float(total_weeks)
    lp.estimated_completion_date = completion_date
    db.flush()

    for other in db.query(LearningPath).filter(
        LearningPath.user_id == user.id,
        LearningPath.status == "active",
        LearningPath.id != lp.id,
    ).all():
        other.is_current = False
        db.add(other)

    for m in roadmap.get("milestones", []):
        m_num = m.get("number", 1)
        steps = m.get("steps", [])
        for j, step in enumerate(steps):
            db.add(
                PathNode(
                    path_id=lp.id,
                    resource_id=step.get("id", f"step_{m_num}_{j}"),
                    resource_title=step.get("title", ""),
                    description=step.get("description", "") or "",
                    milestone_number=m_num,
                    order_in_milestone=j + 1,
                    status="available" if (m_num == 1 and j == 0) else "locked",
                    estimated_hours=float(step.get("estimated_hours", 5)),
                    skills=step.get("skills", []),
                    resources=step.get("resources", []),
                    domain=goal_label,
                )
            )
    db.commit()

    select_current_step(db, lp)

    path_response = _build_ai_path_response(roadmap, lp.id, weekly)
    return lp.id, path_response


def _build_ai_path_response(roadmap: dict, path_id: str, weekly_hours: float) -> PathResponse:
    now = datetime.now(timezone.utc)
    cumulative_weeks = 0.0
    total_hours = 0.0
    milestone_responses = []
    from app.schemas.profile import MilestoneResponse, ResourceItem

    for m in roadmap.get("milestones", []):
        steps = m.get("steps", [])
        m_hours = sum(s.get("estimated_hours", 5) for s in steps)
        weeks = math.ceil(m_hours / weekly_hours) if weekly_hours > 0 else 1
        start_date = now + timedelta(weeks=cumulative_weeks)
        end_date = start_date + timedelta(weeks=weeks)
        nodes = []
        for j, step in enumerate(steps):
            nodes.append(
                PathNodeResponse(
                    node_id=step.get("id", f"step_{j}"),
                    resource_id=step.get("id", f"step_{j}"),
                    title=step.get("title", ""),
                    description=step.get("description", ""),
                    status="available" if j == 0 else "locked",
                    estimated_hours=float(step.get("estimated_hours", 5)),
                    milestone=m.get("number", len(milestone_responses) + 1),
                    order=j + 1,
                    skills=step.get("skills", []),
                    resources=[
                        ResourceItem(
                            title=r.get("title", ""),
                            type=r.get("type", "article"),
                            url=r.get("url", ""),
                            source=r.get("source", ""),
                        )
                        for r in step.get("resources", []) or []
                        if isinstance(r, dict)
                    ],
                )
            )
        milestone_responses.append(
            MilestoneResponse(
                number=m.get("number", len(milestone_responses) + 1),
                title=m.get("title", f"Milestone {m.get('number', 1)}"),
                description=m.get("description", ""),
                estimated_hours=m_hours,
                estimated_weeks=weeks,
                estimated_start_date=start_date.strftime("%Y-%m-%d"),
                estimated_end_date=end_date.strftime("%Y-%m-%d"),
                nodes=nodes,
            )
        )
        total_hours += m_hours
        cumulative_weeks += weeks

    return PathResponse(
        path_id=path_id,
        milestones=milestone_responses,
        total_estimated_hours=total_hours,
        total_estimated_weeks=cumulative_weeks,
        estimated_completion_date=(now + timedelta(weeks=cumulative_weeks)).strftime("%Y-%m-%d"),
    )


# ---------------------------------------------------------------------------
# Create / update a goal
# ---------------------------------------------------------------------------
async def create_or_update_goal(db: Session, user: User, data: GoalCreate) -> tuple[LearningPath, PathResponse]:
    """Create (or refresh) the roadmap for a single learning role."""
    target_role = (data.target_role or "").strip()
    goal = (data.goal or "").strip()

    if not target_role and not goal:
        raise HTTPException(status_code=400, detail="Either 'target_role' or 'goal' must be provided.")

    key, is_custom = role_key(target_role, goal)
    if data.is_custom:
        is_custom = True

    existing_before = _existing_path_for_role(db, user.id, key)
    if not existing_before and active_path_count(db, user.id) >= MAX_ACTIVE_PATHS:
        raise HTTPException(
            status_code=400,
            detail="You currently have 2 active learning paths.",
        )

    _apply_request_metadata(db, user, data, key, is_custom)

    goal_label = data.goal or role_display(key)

    if not is_custom:
        try:
            path_response = generate_learning_path(db, user.id, target_role=key)
            lp = _existing_path_for_role(db, user.id, key)
            if not lp or not path_response.path_id:
                raise HTTPException(status_code=500, detail="Failed to create learning path.")
            return lp, path_response
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("path_generator failed for known role '%s': %s", key, exc)
            logger.info("Falling back to AI generator for known role '%s'", key)

    from app.services.ai_roadmap_generator import generate_ai_roadmap

    try:
        roadmap = await generate_ai_roadmap(
            goal=goal_label,
            experience_level=data.experience_level,
            weekly_hours=data.weekly_hours,
            skills=data.skills,
            learning_style=data.preferred_learning_style,
        )
    except Exception as exc:
        logger.error("AI roadmap generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Roadmap generation failed. Please try again.")

    path_id, path_response = save_ai_roadmap(
        db, user, key, goal_label, roadmap, data.weekly_hours or 5.0
    )
    lp = _existing_path_for_role(db, user.id, key)
    return lp, path_response


# ---------------------------------------------------------------------------
# Summaries
# ---------------------------------------------------------------------------
def get_goals_summary(db: Session, user_id: str) -> GoalsResponse:
    paths = (
        db.query(LearningPath)
        .filter(
            LearningPath.user_id == user_id,
            LearningPath.status.in_(("active", "completed")),
        )
        .order_by(LearningPath.created_at.asc())
        .all()
    )
    goals: list[PathSummary] = []
    active_path_id = ""
    for p in paths:
        nodes = path_nodes(db, p.id)
        stats = path_stats(nodes, p.status)
        if p.is_current:
            active_path_id = p.id

        current_step_title = ""
        current_milestone = 0
        if stats["total_steps"]:
            current_node = next(
                (n for n in nodes if n.status == "current"),
                next((n for n in nodes if n.status in ("available", "in_progress")), None),
            )
            if current_node:
                current_step_title = current_node.resource_title or ""
                current_milestone = current_node.milestone_number
            elif not current_milestone:
                current_milestone = next(
                    (n.milestone_number for n in nodes if n.status not in ("completed", "skipped")),
                    stats["total_milestones"] or 0,
                )

        goals.append(PathSummary(
            path_id=p.id,
            target_role=p.target_role,
            role_label=role_display(p.target_role),
            is_current=p.is_current,
            is_custom=p.is_custom,
            status=p.status,
            progress_percentage=round(stats["overall_progress"] * 100, 1),
            completed_steps=stats["completed_steps"],
            skipped_steps=stats["skipped_steps"],
            total_steps=stats["total_steps"],
            current_milestone=current_milestone,
            current_milestone_title=milestone_title(current_milestone) if current_milestone else "",
            current_step_title=current_step_title,
            completed_milestones=stats["completed_milestones"],
            total_milestones=stats["total_milestones"],
            path_completed=stats["complete"],
            estimated_completion_date=(
                p.estimated_completion_date.strftime("%Y-%m-%d") if p.estimated_completion_date else None
            ),
        ))
    return GoalsResponse(active_path_id=active_path_id, goals=goals)


def get_onboarding_status(db: Session, user_id: str) -> OnboardingStatusResponse:
    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    onboarding_complete = bool(profile and profile.onboarding_complete)
    has_any_path = (
        db.query(LearningPath)
        .filter(
            LearningPath.user_id == user_id,
            LearningPath.status.in_(("active", "completed")),
        )
        .first()
    ) is not None
    count = active_path_count(db, user_id)
    needs = (not onboarding_complete) or (not has_any_path)
    return OnboardingStatusResponse(
        needs_onboarding=needs,
        onboarding_complete=onboarding_complete,
        active_goals=count,
        max_goals=MAX_ACTIVE_PATHS,
    )