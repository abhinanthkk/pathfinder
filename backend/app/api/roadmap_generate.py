"""
POST /roadmap/generate

Backward-compatible wrapper around the goal service. Accepts a goal + learner
preferences and creates/refreshes a roadmap for that role (never clobbering a
different active role).
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.models.database import get_db
from app.models.models import User
from app.schemas.profile import GoalCreate, PathResponse, RoadmapGenerateRequest
from app.services.goal_service import create_or_update_goal

router = APIRouter(tags=["roadmap"])
logger = logging.getLogger(__name__)


@router.post("/roadmap/generate", response_model=PathResponse)
async def generate_roadmap(
    data: RoadmapGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal_data = GoalCreate(
        target_role=(data.target_role or "").strip(),
        goal=(data.goal or data.target_role or "").strip(),
        is_custom=bool(data.goal and not data.target_role),
        experience_level=data.experience_level,
        weekly_hours=data.weekly_hours,
        preferred_learning_style=data.learning_style,
        skills=data.skills,
    )
    _, path_response = await create_or_update_goal(db, current_user, goal_data)
    return path_response