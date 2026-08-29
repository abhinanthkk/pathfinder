from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import User, UserStreak, UserActivity
from app.schemas.profile import StreakResponse, ActivityRequest, DayActivity
from app.core.auth import get_current_user

router = APIRouter(tags=["streak"])


def update_streak(db: Session, user_id: str) -> UserStreak:
    """
    Update user streak based on today's activity.
    Call this whenever a user completes a learning step.
    Returns the updated (or newly created) UserStreak object.
    """
    today = date.today()
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()

    if not streak:
        streak = UserStreak(
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today,
        )
        db.add(streak)
    else:
        last = streak.last_activity_date
        if last == today:
            pass  # already counted today
        elif last == today - timedelta(days=1):
            streak.current_streak += 1
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        else:
            streak.current_streak = 1  # reset streak
        streak.last_activity_date = today

    # Record activity entry for today (at most once per day)
    existing_activity = db.query(UserActivity).filter(
        UserActivity.user_id == user_id,
        UserActivity.activity_date == today,
    ).first()
    if not existing_activity:
        db.add(UserActivity(
            user_id=user_id,
            activity_date=today,
            activity_type="step_completed",
        ))

    db.commit()
    db.refresh(streak)
    return streak


def _build_weekly_activity(db: Session, user_id: str) -> list[DayActivity]:
    """Return activity status for the last 7 days (today inclusive)."""
    today = date.today()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]

    active_dates = {
        a.activity_date
        for a in db.query(UserActivity)
        .filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_date >= days[0],
            UserActivity.activity_date <= today,
        )
        .all()
    }

    return [
        DayActivity(date=d.isoformat(), active=(d in active_dates))
        for d in days
    ]


@router.get("/streak", response_model=StreakResponse)
def get_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()

    weekly = _build_weekly_activity(db, user_id)

    if not streak:
        return StreakResponse(
            current_streak=0,
            longest_streak=0,
            last_activity_date=None,
            weekly_activity=weekly,
        )

    last_date = streak.last_activity_date.isoformat() if streak.last_activity_date else None

    return StreakResponse(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        last_activity_date=last_date,
        weekly_activity=weekly,
    )


@router.post("/activity", response_model=StreakResponse)
def record_activity(
    data: ActivityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually record an activity and update the streak."""
    user_id = current_user.id

    today = date.today()
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()

    if not streak:
        streak = UserStreak(
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_activity_date=today,
        )
        db.add(streak)
    else:
        last = streak.last_activity_date
        if last == today:
            pass
        elif last == today - timedelta(days=1):
            streak.current_streak += 1
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        else:
            streak.current_streak = 1
        streak.last_activity_date = today

    # Record the activity with the provided type
    existing_activity = db.query(UserActivity).filter(
        UserActivity.user_id == user_id,
        UserActivity.activity_date == today,
        UserActivity.activity_type == data.activity_type,
    ).first()
    if not existing_activity:
        db.add(UserActivity(
            user_id=user_id,
            activity_date=today,
            activity_type=data.activity_type,
        ))

    db.commit()
    db.refresh(streak)

    weekly = _build_weekly_activity(db, user_id)
    last_date = streak.last_activity_date.isoformat() if streak.last_activity_date else None

    return StreakResponse(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        last_activity_date=last_date,
        weekly_activity=weekly,
    )
