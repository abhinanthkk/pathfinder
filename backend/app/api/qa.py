from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import LearnerProfile, UserSkill, LearningPath, PathNode
from app.services.skill_graph import get_skill_graph
from app.services.llm_service import answer_learner_question
from app.core.auth import get_current_user
from app.models.models import User

router = APIRouter(tags=["qa"])


class LearnerQuestionRequest(BaseModel):
    user_id: str
    question: str
    resource_id: str | None = None


class LearnerQuestionResponse(BaseModel):
    answer: str


@router.post("/ask", response_model=LearnerQuestionResponse)
async def ask_question(data: LearnerQuestionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sg = get_skill_graph()
    user_id = current_user.id

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()

    profile_dict = {}
    if profile:
        user_skills = {
            s.skill_id: s.confidence
            for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
        }
        profile_dict = {
            "goal": profile.goal,
            "target_role": profile.target_role,
            "experience_level": profile.experience_level,
            "weekly_hours": profile.weekly_hours,
            "preferred_learning_style": profile.preferred_learning_style,
            "skills": user_skills,
        }

    path_dict = None
    learning_path = db.query(LearningPath).filter(
        LearningPath.user_id == user_id,
        LearningPath.status == "active",
    ).first()
    if learning_path:
        nodes = db.query(PathNode).filter(PathNode.path_id == learning_path.id).all()
        path_dict = {
            "total_hours": learning_path.total_estimated_hours,
            "estimated_weeks": learning_path.total_estimated_weeks,
            "nodes": [
                {
                    "resource_id": n.resource_id,
                    "title": n.resource_title,
                    "status": n.status,
                    "milestone": n.milestone_number,
                }
                for n in nodes
            ],
        }

    current_node_dict = None
    if data.resource_id:
        resource = sg.get_resource(data.resource_id)
        if resource:
            node = db.query(PathNode).filter(
                PathNode.path_id == learning_path.id if learning_path else False,
                PathNode.resource_id == data.resource_id,
            ).first() if learning_path else None
            current_node_dict = {
                "resource_id": data.resource_id,
                "title": resource.get("title", ""),
                "description": resource.get("description", ""),
                "skills": resource.get("skills", []),
                "prerequisites": resource.get("prerequisites", []),
                "difficulty": resource.get("difficulty", ""),
                "estimated_hours": resource.get("estimated_hours", 0),
                "status": node.status if node else "unknown",
            }

    answer = await answer_learner_question(
        question=data.question,
        profile=profile_dict,
        current_path=path_dict,
        current_node=current_node_dict,
    )

    return LearnerQuestionResponse(answer=answer)
