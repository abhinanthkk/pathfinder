import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
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
from app.services.progression import (
    get_active_path, find_node, mark_step_complete, mark_step_skipped,
    build_node_response,
)

router = APIRouter(tags=["progress"])


@router.post("/paths/{path_id}/steps/{node_id}/complete", response_model=ProgressResponse)
def complete_step(
    path_id: str,
    node_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    path = get_active_path(db, current_user.id, path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found.")
    node = find_node(db, path, node_id=node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Step not found in this path.")
    return mark_step_complete(db, current_user, path, node)


@router.post("/paths/{path_id}/steps/{node_id}/skip", response_model=ProgressResponse)
def skip_step(
    path_id: str,
    node_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    path = get_active_path(db, current_user.id, path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found.")
    node = find_node(db, path, node_id=node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Step not found in this path.")
    return mark_step_skipped(db, current_user, path, node)


@router.post("/progress", response_model=ProgressResponse)
async def update_progress(
    data: ProgressRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Legacy endpoint, kept for backwards compatibility. Scoped to the user's
    current role; 'completed' / 'skipped' statuses delegate to the shared
    progression service.
    """
    sg = get_skill_graph()
    user_id = current_user.id

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        return ProgressResponse()

    learning_path = get_active_path(db, user_id)
    if not learning_path:
        return ProgressResponse()

    node = db.query(PathNode).filter(
        PathNode.path_id == learning_path.id,
        PathNode.resource_id == data.resource_id,
    ).first()

    if not node:
        return ProgressResponse()

    if data.status == "completed":
        return mark_step_complete(db, current_user, learning_path, node)
    if data.status == "skipped":
        return mark_step_skipped(db, current_user, learning_path, node)

    old_status = node.status
    node.status = data.status

    skill_changes = {}
    resource = sg.get_resource(data.resource_id)
    node_skills: list[str] = node.skills or []

    effective_skills = list(resource.get("skills", []) if resource else [])
    for s in node_skills:
        if s not in effective_skills:
            effective_skills.append(s)

    if data.status == "in_progress":
        node.started_at = datetime.now(timezone.utc)

    if data.status == "failed" and effective_skills:
        for skill_id in effective_skills:
            existing = (
                db.query(UserSkill)
                .filter(UserSkill.user_id == user_id, UserSkill.skill_id == skill_id)
                .first()
            )
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

    if data.status == "failed":
        trigger = "assessment_failed"
        fallback = (
            f"Failed '{node.resource_title or data.resource_id}'. "
            f"Your relevant skills have been reduced. Consider reviewing the material before retrying."
        )
        db.add(AdaptationEvent(
            user_id=user_id,
            path_id=learning_path.id,
            trigger=trigger,
            explanation=fallback,
        ))
        adaptation = {
            "trigger": trigger,
            "explanation": fallback,
            "nodes_added": [],
            "nodes_removed": [],
        }
        path_changed = True

    db.commit()

    return ProgressResponse(
        updated_node=build_node_response(node),
        skill_changes=skill_changes,
        path_changed=path_changed,
        adaptation=adaptation,
    )