from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.schemas.profile import PathRequest, PathResponse, GoalsResponse
from app.services.path_generator import generate_learning_path, get_path
from app.core.auth import get_current_user
from app.models.models import User
from app.services.goal_service import get_goals_summary

router = APIRouter(tags=["path"])


@router.get("/paths", response_model=GoalsResponse)
def list_paths(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_goals_summary(db, current_user.id)


@router.post("/path", response_model=PathResponse)
def create_path(data: PathRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return generate_learning_path(db, current_user.id)


@router.get("/path", response_model=PathResponse)
def fetch_path(
    path_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = get_path(db, current_user.id, path_id)
    if not result.path_id:
        raise HTTPException(status_code=404, detail="No active learning path found")
    return result


@router.get("/paths/{path_id}", response_model=PathResponse)
def fetch_path_by_id(
    path_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = get_path(db, current_user.id, path_id)
    if not result.path_id:
        raise HTTPException(status_code=404, detail="Learning path not found")
    return result
