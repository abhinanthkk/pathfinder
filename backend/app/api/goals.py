from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.models.database import get_db
from app.models.models import User, LearningPath
from app.schemas.profile import (
    GoalCreate,
    GoalCreateResponse,
    GoalsResponse,
    OnboardingStatusResponse,
)
from app.services.goal_service import (
    create_or_update_goal,
    delete_learning_path,
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


@router.put("/paths/{path_id}/activate", response_model=GoalsResponse)
def activate_path(
    path_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alias of goals activate — switches the active/current roadmap."""
    path = set_current_path(db, current_user.id, path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Learning path not found.")
    return get_goals_summary(db, current_user.id)


@router.post("/paths/{path_id}/archive", response_model=GoalsResponse)
def archive_path(
    path_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Archive a roadmap so its slot can be reused. Archived paths are no longer
    listed as active learning roles. If the archived path was the current one,
    another active path (if any) becomes current.
    """
    path = (
        db.query(LearningPath)
        .filter(
            LearningPath.id == path_id,
            LearningPath.user_id == current_user.id,
            LearningPath.status == "active",
        )
        .first()
    )
    if not path:
        raise HTTPException(status_code=404, detail="Active learning path not found.")

    if path.is_current:
        replacement = (
            db.query(LearningPath)
            .filter(
                LearningPath.user_id == current_user.id,
                LearningPath.status == "active",
                LearningPath.id != path_id,
            )
            .order_by(LearningPath.created_at.asc())
            .first()
        )
        if replacement:
            replacement.is_current = True
            db.add(replacement)

    path.status = "archived"
    path.is_current = False
    db.add(path)
    db.commit()
    return get_goals_summary(db, current_user.id)


@router.delete("/paths/{path_id}", response_model=GoalsResponse)
def delete_path(
    path_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently remove one learning path and all its scoped data (nodes,
    progress, skills, badges, adaptation activity).

    The final remaining path can never be deleted — add another path first.
    Deleted-path detection uses `DELETE` on `/api/paths/{path_id}`.
    """
    return delete_learning_path(db, current_user.id, path_id)