from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import User, SkillProgress, LearningPath, PathNode
from app.schemas.profile import SkillProgressResponse, SkillProgressItem
from app.core.auth import get_current_user

router = APIRouter(tags=["skill_progress"])


def _current_learning_path(db: Session, user_id: str) -> LearningPath | None:
    p = (
        db.query(LearningPath)
        .filter(
            LearningPath.user_id == user_id,
            LearningPath.status == "active",
            LearningPath.is_current.is_(True),
        )
        .first()
    )
    if p:
        return p
    return (
        db.query(LearningPath)
        .filter(LearningPath.user_id == user_id, LearningPath.status == "active")
        .order_by(LearningPath.created_at.asc())
        .first()
    )


def recalculate_skill_progress(
    db: Session, user_id: str, path: LearningPath | None = None
) -> list[SkillProgressItem]:
    """
    Recalculate skill progress for all skills on a specific learning role.

    Results are scoped by `path_id` so the two active roles never interfere.

    For each skill that appears across path nodes:
    - total_weight  = sum of estimated_hours across ALL nodes that teach the skill
    - completed_weight = sum of estimated_hours for COMPLETED nodes that teach the skill
    - progress_percentage = completed_weight / total_weight * 100

    Returns the list of SkillProgressItems and persists them to the DB.
    """
    learning_path = path if path is not None else _current_learning_path(db, user_id)

    if not learning_path:
        return []

    nodes = db.query(PathNode).filter(PathNode.path_id == learning_path.id).all()
    path_id = learning_path.id

    # Aggregate per skill (per-role)
    skill_total: dict[str, float] = {}
    skill_completed: dict[str, float] = {}

    for node in nodes:
        skills: list[str] = node.skills or []
        hours = node.estimated_hours or 1.0
        for skill in skills:
            if not skill:
                continue
            skill_total[skill] = skill_total.get(skill, 0.0) + hours
            if node.status == "completed":
                skill_completed[skill] = skill_completed.get(skill, 0.0) + hours

    result: list[SkillProgressItem] = []

    for skill_name, total in skill_total.items():
        completed = skill_completed.get(skill_name, 0.0)
        pct = round((completed / total * 100) if total > 0 else 0.0, 1)

        # Upsert into SkillProgress table
        existing = (
            db.query(SkillProgress)
            .filter(
                SkillProgress.user_id == user_id,
                SkillProgress.path_id == path_id,
                SkillProgress.skill_name == skill_name,
            )
            .first()
        )
        if existing:
            existing.progress_percentage = pct
            existing.completed_weight = completed
            existing.total_weight = total
        else:
            db.add(
                SkillProgress(
                    user_id=user_id,
                    path_id=path_id,
                    skill_name=skill_name,
                    progress_percentage=pct,
                    completed_weight=completed,
                    total_weight=total,
                )
            )

        result.append(
            SkillProgressItem(
                skill_name=skill_name,
                progress_percentage=pct,
                completed_weight=completed,
                total_weight=total,
            )
        )

    db.commit()
    return sorted(result, key=lambda x: x.skill_name)


def _get_persisted(db: Session, user_id: str, path_id: str | None) -> list[SkillProgressItem]:
    query = db.query(SkillProgress).filter(SkillProgress.user_id == user_id)
    if path_id:
        query = query.filter(SkillProgress.path_id == path_id)
    else:
        # Legacy rows (no path) are still surfaced as fallback.
        query = query.filter(SkillProgress.path_id == "")
    records = query.order_by(SkillProgress.skill_name).all()
    return [
        SkillProgressItem(
            skill_name=r.skill_name,
            progress_percentage=r.progress_percentage,
            completed_weight=r.completed_weight,
            total_weight=r.total_weight,
        )
        for r in records
    ]


@router.get("/skill-progress", response_model=SkillProgressResponse)
def get_skill_progress(
    path_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    if path_id is None:
        lp = _current_learning_path(db, user_id)
        path_id = lp.id if lp else ""

    items = _get_persisted(db, user_id, path_id)
    if items:
        return SkillProgressResponse(skills=items)

    # No records yet — trigger a first calculation
    lp = _current_learning_path(db, user_id)
    if lp and lp.id == path_id:
        items = recalculate_skill_progress(db, user_id, lp)
    return SkillProgressResponse(skills=items)


@router.post("/skill-progress/recalculate", response_model=SkillProgressResponse)
def recalculate(
    path_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Force a full recalculation of skill progress from a role's path nodes."""
    user_id = current_user.id
    lp = _current_learning_path(db, user_id)
    if path_id:
        lp = (
            db.query(LearningPath)
            .filter(LearningPath.id == path_id, LearningPath.user_id == user_id)
            .first()
        )
    items = recalculate_skill_progress(db, user_id, lp)
    return SkillProgressResponse(skills=items)
