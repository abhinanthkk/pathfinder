import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db, SessionLocal
from app.models.models import (
    LearnerProfile, UserSkill, LearningPath, PathNode,
    ProgressEvent, AdaptationEvent,
)
from app.schemas.profile import ProgressRequest, ProgressResponse, PathNodeResponse, SkillChange
from app.services.skill_graph import get_skill_graph
from app.services.llm_service import generate_adaptation_explanation
from app.core.auth import get_current_user
from app.models.models import User

router = APIRouter(tags=["progress"])


@router.post("/progress", response_model=ProgressResponse)
async def update_progress(
    data: ProgressRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sg = get_skill_graph()
    user_id = current_user.id

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        return ProgressResponse()

    learning_path = db.query(LearningPath).filter(
        LearningPath.user_id == user_id,
        LearningPath.status == "active",
    ).first()

    if not learning_path:
        return ProgressResponse()

    node = db.query(PathNode).filter(
        PathNode.path_id == learning_path.id,
        PathNode.resource_id == data.resource_id,
    ).first()

    if not node:
        return ProgressResponse()

    old_status = node.status
    node.status = data.status

    if data.status == "completed":
        node.completed_at = datetime.now(timezone.utc)
    elif data.status == "in_progress":
        node.started_at = datetime.now(timezone.utc)

    skill_changes = {}
    resource = sg.get_resource(data.resource_id)

    if data.status == "completed" and resource:
        for skill_id in resource.get("skills", []):
            existing = db.query(UserSkill).filter(
                UserSkill.user_id == user_id,
                UserSkill.skill_id == skill_id,
            ).first()
            old_conf = existing.confidence if existing else 0.0
            new_conf = min(1.0, old_conf + 0.2)
            if existing:
                existing.confidence = new_conf
            else:
                db.add(UserSkill(
                    user_id=user_id,
                    skill_id=skill_id,
                    confidence=new_conf,
                    source="assessment",
                ))
            skill_changes[skill_id] = SkillChange(old=old_conf, new=new_conf)

    elif data.status == "failed" and resource:
        for skill_id in resource.get("skills", []):
            existing = db.query(UserSkill).filter(
                UserSkill.user_id == user_id,
                UserSkill.skill_id == skill_id,
            ).first()
            old_conf = existing.confidence if existing else 0.0
            new_conf = max(0.0, old_conf - 0.15)
            if existing:
                existing.confidence = new_conf
            skill_changes[skill_id] = SkillChange(old=old_conf, new=new_conf)

    db.add(ProgressEvent(
        user_id=user_id,
        resource_id=data.resource_id,
        old_status=old_status,
        new_status=data.status,
        skill_changes={k: {"old": v.old, "new": v.new} for k, v in skill_changes.items()},
    ))

    path_changed = False
    adaptation = None

    if data.status in ("completed", "failed"):
        _unlock_dependents(learning_path, node, db)
        path_changed = True

        trigger = "course_completed" if data.status == "completed" else "assessment_failed"

        change_dict = {k: {"old": v.old, "new": v.new} for k, v in skill_changes.items()}
        resource_title = resource.get("title", data.resource_id) if resource else data.resource_id
        resource_skills = resource.get("skills", []) if resource else []
        fallback = _fallback_adaptation_explanation(data.status, resource, skill_changes)

        adaptation_event = AdaptationEvent(
            user_id=user_id,
            path_id=learning_path.id,
            trigger=trigger,
            explanation=fallback,
        )
        db.add(adaptation_event)
        db.flush()

        if trigger == "course_completed":
            adaptation_event_id = adaptation_event.id
            background_tasks.add_task(
                _enrich_adaptation,
                adaptation_event_id,
                user_id,
                trigger,
                resource_title,
                resource_skills,
                change_dict,
                profile.goal,
            )

        adaptation = {
            "trigger": trigger,
            "explanation": fallback,
            "nodes_added": [],
            "nodes_removed": [],
        }

    db.commit()

    updated_node = PathNodeResponse(
        node_id=node.id,
        resource_id=node.resource_id,
        title=node.resource_title,
        status=node.status,
        estimated_hours=node.estimated_hours,
        milestone=node.milestone_number,
        order=node.order_in_milestone,
    )

    return ProgressResponse(
        updated_node=updated_node,
        skill_changes=skill_changes,
        path_changed=path_changed,
        adaptation=adaptation,
    )


def _enrich_adaptation(
    event_id: str,
    user_id: str,
    trigger: str,
    resource_title: str,
    resource_skills: list,
    skill_changes: dict,
    goal: str,
):
    # create a fresh session; the request-scoped session is closed before background tasks run
    db = SessionLocal()
    try:
        explanation = asyncio.run(
            generate_adaptation_explanation(
                trigger=trigger,
                resource_title=resource_title,
                resource_skills=resource_skills,
                skill_changes=skill_changes,
                goal=goal or "",
            )
        )
        event = db.query(AdaptationEvent).filter(AdaptationEvent.id == event_id).first()
        if event:
            event.explanation = explanation
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def _unlock_dependents(path, completed_node, db):
    all_nodes = db.query(PathNode).filter(
        PathNode.path_id == path.id,
        PathNode.status == "locked",
    ).all()

    sg = get_skill_graph()
    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(
            UserSkill.user_id == path.user_id
        ).all()
    }

    for n in all_nodes:
        if n.resource_id == completed_node.resource_id:
            continue
        resource = sg.get_resource(n.resource_id)
        if not resource:
            continue
        prereqs = resource.get("prerequisites", [])
        met = all(user_skills.get(p, 0) >= 0.3 for p in prereqs)
        if met:
            n.status = "available"


def _fallback_adaptation_explanation(status, resource, skill_changes):
    if not resource:
        return "Your path has been updated."
    skills = resource.get("skills", [])
    skill_names = ", ".join(skills) if skills else "the topic"
    if status == "completed":
        return f"Completed '{resource.get('title', '')}'. Your {skill_names} skills have been updated and dependent topics are now unlocked."
    else:
        return f"Failed '{resource.get('title', '')}'. Your {skill_names} confidence has been reduced. Consider reviewing the material before retrying."
