from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.models.database import get_db
from app.models.models import User
from app.schemas.profile import (
    GoalCreate,
    GoalCreateResponse,
    GoalsResponse,
    OnboardingStatusResponse,
)
from app.services.goal_service import (
    create_or_update_goal,
    get_goals_summary,
    get_onboarding_status,
)
from app.services.progression import set_current_path

router = APIRouter(tags=["goals"])


@router.get("/onboarding-status", response_model=OnboardingStatusResponse)
def onboarding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_onboarding_status(db, current_user.id)


@router.get("/goals", response_model=GoalsResponse)
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_goals_summary(db, current_user.id)


@router.post("/goals", response_model=GoalCreateResponse)
async def create_goal(
    data: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _, path_response = await create_or_update_goal(db, current_user, data)
    goals = get_goals_summary(db, current_user.id)
    return GoalCreateResponse(path=path_response, goals=goals)


@router.post("/goals/{path_id}/activate", response_model=GoalsResponse)
def activate_goal(
    path_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    path = set_current_path(db, current_user.id, path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found.")
    return get_goals_summary(db, current_user.id)