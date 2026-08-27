from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import LearnerProfile, UserSkill, LearningPath, PathNode
from app.schemas.profile import ExplainRequest, ExplainResponse, ScoreBreakdown
from app.services.skill_graph import get_skill_graph
from app.models.models import User
from app.services.llm_service import build_personalized_fallback_explanation
from app.core.auth import get_current_user

router = APIRouter(tags=["explain"])


@router.post("/explain", response_model=ExplainResponse)
async def explain(
    data: ExplainRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sg = get_skill_graph()
    user_id = current_user.id

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        return ExplainResponse(explanation="Profile not found.")

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

    resource = sg.get_resource(data.resource_id)
    if not resource:
        return ExplainResponse(explanation="Resource not found.")

    prereqs = resource.get("prerequisites", [])
    prereq_status = {}
    for p in prereqs:
        conf = user_skills.get(p, 0.0)
        prereq_status[p] = "met" if conf >= 0.5 else "not met"

    # Path position: what comes before (already completed) and after (unlocks)
    previous_items = []
    unlocks = []
    learning_path = db.query(LearningPath).filter(
        LearningPath.user_id == user_id,
        LearningPath.status == "active",
    ).first()
    if learning_path:
        nodes = (
            db.query(PathNode)
            .filter(PathNode.path_id == learning_path.id)
            .order_by(PathNode.milestone_number, PathNode.order_in_milestone)
            .all()
        )
        titles = [n.resource_title for n in nodes]
        ids = [n.resource_id for n in nodes]
        if data.resource_id in ids:
            idx = ids.index(data.resource_id)
            previous_items = [
                t for t, s in zip(titles[:idx], nodes[:idx]) if s.status in ("completed", "skipped")
            ]
            unlocks = titles[idx + 1 : idx + 5]

    goal_label = profile.goal or (profile.target_role or "").replace("_", " ").title()

    # Deterministic, data-grounded explanation returned immediately (fallback).
    explanation = await build_personalized_fallback_explanation(
        goal=goal_label,
        skills=user_skills,
        gaps=gaps,
        resource_title=resource.get("title", ""),
        resource_description=resource.get("description", ""),
        resource_skills=resource.get("skills", []),
        prerequisites=prereqs,
        prereq_status=prereq_status,
        unlocks=unlocks,
        previous_items=previous_items,
    )

    gaps_addressed = [s for s in resource.get("skills", []) if s in gaps]

    return ExplainResponse(
        explanation=explanation,
        score_breakdown=ScoreBreakdown(),
        skill_gaps_addressed=gaps_addressed,
        prerequisites_status=prereq_status,
    )
