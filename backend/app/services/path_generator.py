from __future__ import annotations
import math
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.models import UserSkill, LearningPath, PathNode, LearnerProfile
from app.core.dag import DAG
from app.services.skill_graph import get_skill_graph
from app.schemas.profile import PathResponse, MilestoneResponse, PathNodeResponse


MILESTONE_TITLES = [
    "Foundations",
    "Core Concepts",
    "Specialized Skills",
    "Integration & Advanced",
    "Capstone & Mastery",
]


def generate_learning_path(db: Session, user_id: str) -> PathResponse:
    sg = get_skill_graph()

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        return PathResponse(path_id="", milestones=[])

    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    }

    goal_skills = sg.get_goal_skills(profile.target_role)
    gaps = {
        skill: max(0.0, required - user_skills.get(skill, 0.0))
        for skill, required in goal_skills.items()
        if user_skills.get(skill, 0.0) < required
    }

    selected_resources = _select_resources(sg, gaps, user_skills, profile)

    all_resources = _expand_prerequisites(sg, selected_resources, user_skills)

    resource_dag = _build_resource_dag(sg, all_resources)

    sorted_resources = resource_dag.topological_sort()

    milestones = _group_milestones(sorted_resources, sg)

    now = datetime.now(timezone.utc)
    cumulative_weeks = 0.0

    milestone_responses = []
    for i, milestone_resources in enumerate(milestones):
        total_hours = sum(sg.resources.get(rid, {}).get("estimated_hours", 5) for rid in milestone_resources)
        weeks = math.ceil(total_hours / profile.weekly_hours) if profile.weekly_hours > 0 else 1

        start_date = now + timedelta(weeks=cumulative_weeks)
        end_date = start_date + timedelta(weeks=weeks)

        nodes = []
        for j, rid in enumerate(milestone_resources):
            res = sg.resources.get(rid, {})
            met = _check_prereqs_met(sg, rid, user_skills, set())
            nodes.append(PathNodeResponse(
                node_id=f"{user_id}_{rid}",
                resource_id=rid,
                title=res.get("title", rid),
                status="available" if met else "locked",
                estimated_hours=res.get("estimated_hours", 5),
                milestone=i + 1,
                order=j + 1,
            ))

        milestone_responses.append(MilestoneResponse(
            number=i + 1,
            title=MILESTONE_TITLES[i] if i < len(MILESTONE_TITLES) else f"Milestone {i+1}",
            estimated_hours=total_hours,
            estimated_weeks=weeks,
            estimated_start_date=start_date.strftime("%Y-%m-%d"),
            estimated_end_date=end_date.strftime("%Y-%m-%d"),
            nodes=nodes,
        ))

        cumulative_weeks += weeks

    total_hours = sum(m.estimated_hours for m in milestone_responses)
    total_weeks = cumulative_weeks
    completion_date = now + timedelta(weeks=total_weeks)

    existing = db.query(LearningPath).filter(
        LearningPath.user_id == user_id,
        LearningPath.status == "active",
    ).first()
    if existing:
        db.query(PathNode).filter(PathNode.path_id == existing.id).delete()
        db.delete(existing)
        db.flush()

    path = LearningPath(
        user_id=user_id,
        status="active",
        target_role=profile.target_role,
        profile_signature=_profile_signature(profile, user_skills, goal_skills),
        total_estimated_hours=total_hours,
        total_estimated_weeks=total_weeks,
        estimated_completion_date=completion_date,
    )
    db.add(path)
    db.flush()

    for milestone in milestone_responses:
        for node in milestone.nodes:
            db_node = PathNode(
                path_id=path.id,
                resource_id=node.resource_id,
                resource_title=node.title,
                milestone_number=milestone.number,
                order_in_milestone=node.order,
                status=node.status,
                estimated_hours=node.estimated_hours,
            )
            db.add(db_node)

    db.commit()

    return PathResponse(
        path_id=path.id,
        milestones=milestone_responses,
        total_estimated_hours=total_hours,
        total_estimated_weeks=total_weeks,
        estimated_completion_date=completion_date.strftime("%Y-%m-%d"),
    )


def _select_resources(sg, gaps, user_skills, profile):
    selected = {}
    for skill_id, deficit in gaps.items():
        candidates = sg.get_resources_for_skill(skill_id)
        if not candidates:
            continue

        scored = []
        for r in candidates:
            prereq_ready = _prerequisite_score(r, user_skills)
            if prereq_ready < 0.5 and deficit < 0.3:
                continue
            score = prereq_ready * 0.4 + _format_score(r, profile.preferred_learning_style) * 0.3 + _difficulty_score(r, profile.experience_level) * 0.3
            scored.append((score, r))

        scored.sort(key=lambda x: x[0], reverse=True)
        if scored:
            best = scored[0][1]
            if best["id"] not in selected:
                selected[best["id"]] = best

    return list(selected.values())


def _expand_prerequisites(sg, selected_resources, user_skills):
    all_ids = {r["id"] for r in selected_resources}
    queue = list(all_ids)

    while queue:
        rid = queue.pop(0)
        resource = sg.resources.get(rid, {})
        for prereq_skill in resource.get("prerequisites", []):
            if user_skills.get(prereq_skill, 0) >= 0.5:
                continue
            for candidate in sg.get_resources_for_skill(prereq_skill):
                if candidate["id"] not in all_ids:
                    all_ids.add(candidate["id"])
                    queue.append(candidate["id"])

    # Deterministic ordering: set iteration order is randomized per-process
    # (PYTHONHASHSEED), which would otherwise make the resource DAG and its
    # milestone grouping non-deterministic run-to-run.
    return sorted(all_ids)


def _build_resource_dag(sg, resource_ids):
    dag = DAG()
    skill_to_resource: dict[str, str] = {}

    for rid in resource_ids:
        resource = sg.resources.get(rid, {})
        dag.add_node(rid, resource)
        for skill in resource.get("skills", []):
            if skill not in skill_to_resource:
                skill_to_resource[skill] = rid

    for rid in resource_ids:
        resource = sg.resources.get(rid, {})
        for prereq_skill in resource.get("prerequisites", []):
            if prereq_skill in skill_to_resource:
                prereq_rid = skill_to_resource[prereq_skill]
                if prereq_rid != rid:
                    dag.add_edge(prereq_rid, rid)

    return dag


def _group_milestones(sorted_resources, sg):
    if not sorted_resources:
        return []

    skill_to_resource: dict[str, str] = {}
    for rid in sorted_resources:
        res = sg.resources.get(rid, {})
        for skill in res.get("skills", []):
            if skill not in skill_to_resource:
                skill_to_resource[skill] = rid

    levels: dict[str, int] = {}
    for rid in sorted_resources:
        res = sg.resources.get(rid, {})
        prereqs = res.get("prerequisites", [])
        max_level = -1
        for p in prereqs:
            prereq_rid = skill_to_resource.get(p)
            if prereq_rid and prereq_rid != rid and prereq_rid in levels:
                max_level = max(max_level, levels[prereq_rid])
        levels[rid] = max_level + 1

    grouped: dict[int, list[str]] = {}
    for rid in sorted_resources:
        lvl = levels.get(rid, 0)
        grouped.setdefault(lvl, []).append(rid)

    milestones = []
    for lvl in sorted(grouped.keys()):
        milestones.append(grouped[lvl])

    return milestones


def _check_prereqs_met(sg, resource_id, user_skills, completed_resources):
    resource = sg.resources.get(resource_id, {})
    prereqs = resource.get("prerequisites", [])
    return all(user_skills.get(p, 0) >= 0.5 for p in prereqs)


def _profile_signature(profile, user_skills, goal_skills):
    weekly = round(profile.weekly_hours or 0.0, 1)
    style = profile.preferred_learning_style or ""
    exp = profile.experience_level or ""
    return "|".join([
        profile.target_role or "",
        str(weekly),
        style,
        exp,
    ])


def _prerequisite_score(resource, user_skills):
    prereqs = resource.get("prerequisites", [])
    if not prereqs:
        return 1.0
    met = sum(1 for p in prereqs if user_skills.get(p, 0) >= 0.3)
    return met / len(prereqs)


def _format_score(resource, preferred):
    fmt = resource.get("format", "mixed")
    if preferred == "mixed":
        return 0.7
    return 1.0 if fmt == preferred else 0.4


def _difficulty_score(resource, experience):
    diff_map = {"beginner": 1, "intermediate": 2, "advanced": 3}
    exp_map = {"beginner": 1, "intermediate": 2, "advanced": 3}
    d = diff_map.get(resource.get("difficulty", "beginner"), 1)
    e = exp_map.get(experience, 1)
    return max(0.0, 1.0 - abs(d - e) / 3.0)


def get_path(db: Session, user_id: str) -> PathResponse:
    path = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not path:
        return PathResponse(path_id="", milestones=[])

    active = db.query(LearningPath).filter(
        LearningPath.user_id == user_id,
        LearningPath.status == "active",
    ).first()
    if not active:
        return PathResponse(path_id="", milestones=[])

    current_signature = _profile_signature(
        path,
        {s.skill_id: s.confidence for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()},
        get_skill_graph().get_goal_skills(path.target_role),
    )
    if active.target_role != path.target_role or active.profile_signature != current_signature:
        return generate_learning_path(db, user_id)

    nodes = db.query(PathNode).filter(PathNode.path_id == active.id).order_by(
        PathNode.milestone_number, PathNode.order_in_milestone
    ).all()

    milestones: dict[int, list[PathNodeResponse]] = {}
    for n in nodes:
        mr = PathNodeResponse(
            node_id=n.id,
            resource_id=n.resource_id,
            title=n.resource_title,
            status=n.status,
            estimated_hours=n.estimated_hours,
            milestone=n.milestone_number,
            order=n.order_in_milestone,
        )
        milestones.setdefault(n.milestone_number, []).append(mr)

    milestone_responses = []
    for num in sorted(milestones.keys()):
        mnodes = milestones[num]
        total_hours = sum(n.estimated_hours for n in mnodes)
        profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
        weekly = profile.weekly_hours if profile else 5.0
        weeks = math.ceil(total_hours / weekly) if weekly > 0 else 1
        milestone_responses.append(MilestoneResponse(
            number=num,
            title=MILESTONE_TITLES[num-1] if num <= len(MILESTONE_TITLES) else f"Milestone {num}",
            estimated_hours=total_hours,
            estimated_weeks=weeks,
            nodes=mnodes,
        ))

    completion = active.estimated_completion_date
    return PathResponse(
        path_id=active.id,
        milestones=milestone_responses,
        total_estimated_hours=active.total_estimated_hours,
        total_estimated_weeks=active.total_estimated_weeks,
        estimated_completion_date=completion.strftime("%Y-%m-%d") if completion else None,
    )
