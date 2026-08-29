from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import User, UserBadge, UserStreak, LearningPath, PathNode
from app.schemas.profile import BadgesResponse, BadgeItem, MilestoneCheckRequest, MilestoneCheckResponse
from app.core.auth import get_current_user

router = APIRouter(tags=["badges"])

BADGES = {
    "first_step": {
        "name": "First Step",
        "description": "Completed your first learning step",
        "icon": "🎯",
    },
    "streak_7": {
        "name": "7 Day Warrior",
        "description": "Maintained a 7-day learning streak",
        "icon": "🔥",
    },
    "streak_30": {
        "name": "Consistent Learner",
        "description": "Maintained a 30-day learning streak",
        "icon": "⚡",
    },
    "milestone_1": {
        "name": "Milestone Master",
        "description": "Completed your first milestone",
        "icon": "🏆",
    },
    "halfway": {
        "name": "Halfway There",
        "description": "Reached 50% roadmap completion",
        "icon": "🚀",
    },
    "path_complete": {
        "name": "Path Complete",
        "description": "Completed the entire learning roadmap",
        "icon": "👑",
    },
    "milestone_2": {
        "name": "Double Milestone",
        "description": "Completed two milestones",
        "icon": "⭐",
    },
    "milestone_3": {
        "name": "Triple Milestone",
        "description": "Completed three milestones",
        "icon": "💎",
    },
}


def _badge_item_from_db(b: UserBadge) -> BadgeItem:
    earned_str = b.earned_at.isoformat() if b.earned_at else ""
    return BadgeItem(
        badge_id=b.badge_id,
        badge_name=b.badge_name,
        description=b.description,
        icon=b.icon,
        earned_at=earned_str,
    )


def _current_learning_path(db: Session, user_id: str) -> LearningPath | None:
    """Current active role, preferring the role flagged `is_current`."""
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


def _has_badge(db: Session, user_id: str, badge_id: str, path_id: str = "") -> bool:
    return (
        db.query(UserBadge)
        .filter(
            UserBadge.user_id == user_id,
            UserBadge.badge_id == badge_id,
            UserBadge.path_id == path_id,
        )
        .first()
        is not None
    )


def _award_badge(db: Session, user_id: str, badge_id: str, path_id: str = "") -> BadgeItem:
    """Award a badge to the user. Returns the BadgeItem. Does NOT commit."""
    badge_def = BADGES[badge_id]
    now = datetime.now(timezone.utc)
    badge = UserBadge(
        user_id=user_id,
        badge_id=badge_id,
        badge_name=badge_def["name"],
        description=badge_def["description"],
        icon=badge_def["icon"],
        path_id=path_id,
        earned_at=now,
    )
    db.add(badge)
    return BadgeItem(
        badge_id=badge_id,
        badge_name=badge_def["name"],
        description=badge_def["description"],
        icon=badge_def["icon"],
        earned_at=now.isoformat(),
    )


def check_and_award_badges(db: Session, user_id: str, path: LearningPath | None = None) -> list[BadgeItem]:
    """
    Evaluate all badge conditions for the user and award any newly earned badges.
    When `path` is provided, roadmap-related badges are scoped to that role so a
    second role's progress never leaks into the first.
    Returns a list of newly awarded BadgeItems. Commits the session.
    """
    newly_awarded: list[BadgeItem] = []

    learning_path = path if path is not None else _current_learning_path(db, user_id)

    nodes: list[PathNode] = []
    path_id = learning_path.id if learning_path else ""
    if learning_path:
        nodes = db.query(PathNode).filter(PathNode.path_id == learning_path.id).all()

    total_nodes = len(nodes)
    completed_nodes = sum(1 for n in nodes if n.status == "completed")

    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    current_streak = streak.current_streak if streak else 0

    # Group nodes by milestone
    milestones: dict[int, list[PathNode]] = {}
    for n in nodes:
        milestones.setdefault(n.milestone_number, []).append(n)

    completed_milestones = sum(
        1
        for m_nodes in milestones.values()
        if m_nodes and all(n.status in ("completed", "skipped") for n in m_nodes)
    )

    # --- Badge: first_step (global) ---
    if completed_nodes >= 1 and not _has_badge(db, user_id, "first_step"):
        newly_awarded.append(_award_badge(db, user_id, "first_step"))

    # --- Badge: streak_7 (global) ---
    if current_streak >= 7 and not _has_badge(db, user_id, "streak_7"):
        newly_awarded.append(_award_badge(db, user_id, "streak_7"))

    # --- Badge: streak_30 (global) ---
    if current_streak >= 30 and not _has_badge(db, user_id, "streak_30"):
        newly_awarded.append(_award_badge(db, user_id, "streak_30"))

    # --- Roadmap badges are scoped to the specific learning path ---
    # --- Badge: milestone_1 ---
    if path_id and completed_milestones >= 1 and not _has_badge(db, user_id, "milestone_1", path_id):
        newly_awarded.append(_award_badge(db, user_id, "milestone_1", path_id))

    # --- Badge: milestone_2 ---
    if path_id and completed_milestones >= 2 and not _has_badge(db, user_id, "milestone_2", path_id):
        newly_awarded.append(_award_badge(db, user_id, "milestone_2", path_id))

    # --- Badge: milestone_3 ---
    if path_id and completed_milestones >= 3 and not _has_badge(db, user_id, "milestone_3", path_id):
        newly_awarded.append(_award_badge(db, user_id, "milestone_3", path_id))

    # --- Badge: halfway ---
    if (
        path_id
        and total_nodes > 0
        and completed_nodes / total_nodes >= 0.5
        and not _has_badge(db, user_id, "halfway", path_id)
    ):
        newly_awarded.append(_award_badge(db, user_id, "halfway", path_id))

    # --- Badge: path_complete ---
    if (
        path_id
        and total_nodes > 0
        and completed_nodes == total_nodes
        and not _has_badge(db, user_id, "path_complete", path_id)
    ):
        newly_awarded.append(_award_badge(db, user_id, "path_complete", path_id))

    if newly_awarded:
        db.commit()

    return newly_awarded


@router.get("/badges", response_model=BadgesResponse)
def get_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    user_badges = (
        db.query(UserBadge)
        .filter(UserBadge.user_id == user_id)
        .order_by(UserBadge.earned_at.desc())
        .all()
    )
    return BadgesResponse(badges=[_badge_item_from_db(b) for b in user_badges])


@router.post("/milestone/check", response_model=MilestoneCheckResponse)
def check_milestone(
    data: MilestoneCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id

    learning_path = _current_learning_path(db, user_id)

    if not learning_path:
        return MilestoneCheckResponse(
            milestone_complete=False,
            new_badges=[],
            message="No active learning path found.",
        )

    milestone_nodes = (
        db.query(PathNode)
        .filter(
            PathNode.path_id == learning_path.id,
            PathNode.milestone_number == data.milestone_number,
        )
        .all()
    )

    if not milestone_nodes:
        return MilestoneCheckResponse(
            milestone_complete=False,
            new_badges=[],
            message=f"Milestone {data.milestone_number} not found.",
        )

    milestone_complete = all(
        n.status in ("completed", "skipped") for n in milestone_nodes
    )

    new_badges = []
    if milestone_complete:
        new_badges = check_and_award_badges(db, user_id, learning_path)

    return MilestoneCheckResponse(
        milestone_complete=milestone_complete,
        new_badges=new_badges,
        message=(
            f"Milestone {data.milestone_number} is complete! You earned {len(new_badges)} new badge(s)."
            if milestone_complete
            else f"Milestone {data.milestone_number} is not yet complete."
        ),
    )
