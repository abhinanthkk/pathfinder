import math
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import (
    LearnerProfile, UserSkill, LearningPath, PathNode, AdaptationEvent,
)
from app.schemas.profile import DashboardResponse
from app.services.skill_graph import get_skill_graph
from app.core.auth import get_current_user
from app.models.models import User

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    sg = get_skill_graph()

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        return DashboardResponse()

    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    }

    learning_path = db.query(LearningPath).filter(
        LearningPath.user_id == user_id,
        LearningPath.status == "active",
    ).first()

    if not learning_path:
        return DashboardResponse(skills=user_skills)

    nodes = db.query(PathNode).filter(PathNode.path_id == learning_path.id).all()

    total = len(nodes)
    completed = sum(1 for n in nodes if n.status == "completed")
    overall_progress = completed / total if total > 0 else 0.0

    milestones = {}
    for n in nodes:
        milestones.setdefault(n.milestone_number, []).append(n)

    completed_milestones = 0
    for m_num, m_nodes in sorted(milestones.items()):
        if all(n.status in ("completed", "skipped") for n in m_nodes):
            completed_milestones += 1

    current_milestone = 1
    for m_num, m_nodes in sorted(milestones.items()):
        if any(n.status in ("available", "in_progress") for n in m_nodes):
            current_milestone = m_num
            break

    next_action = None
    for n in sorted(nodes, key=lambda x: (x.milestone_number, x.order_in_milestone)):
        if n.status == "available":
            next_action = {
                "resource_id": n.resource_id,
                "title": n.resource_title,
                "reason": f"Milestone {n.milestone_number}, Step {n.order_in_milestone}",
            }
            break
        elif n.status == "in_progress":
            next_action = {
                "resource_id": n.resource_id,
                "title": n.resource_title,
                "reason": "Currently in progress",
            }
            break

    recent_adaptations = db.query(AdaptationEvent).filter(
        AdaptationEvent.user_id == user_id
    ).order_by(AdaptationEvent.created_at.desc()).limit(5).all()

    adaptations = [
        {
            "trigger": a.trigger,
            "explanation": a.explanation,
            "created_at": a.created_at.isoformat() if a.created_at else "",
        }
        for a in recent_adaptations
    ]

    completion_date = learning_path.estimated_completion_date
    estimated = completion_date.strftime("%Y-%m-%d") if completion_date else None

    return DashboardResponse(
        overall_progress=round(overall_progress, 2),
        current_milestone=current_milestone,
        milestones_completed=completed_milestones,
        total_milestones=len(milestones),
        skills=user_skills,
        next_action=next_action,
        estimated_completion=estimated,
        recent_adaptations=adaptations,
    )
