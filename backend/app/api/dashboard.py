from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import (
    LearnerProfile, UserSkill, AdaptationEvent, UserStreak, UserActivity, UserBadge, SkillProgress,
)
from app.schemas.profile import (
    DashboardResponse, StreakResponse, DayActivity, BadgeItem,
    SkillProgressItem, MilestoneBreakdown, UpcomingMilestone,
)
from app.services.progression import (
    get_active_path, path_nodes, path_stats, select_current_step,
    milestone_stats, build_node_list,
)
from app.services.goal_service import role_display, milestone_title
from app.core.auth import get_current_user
from app.models.models import User

router = APIRouter(tags=["dashboard"])


def _build_streak(db: Session, user_id: str) -> StreakResponse:
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
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
    weekly = [DayActivity(date=d.isoformat(), active=(d in active_dates)) for d in days]

    if not streak:
        return StreakResponse(
            current_streak=0,
            longest_streak=0,
            last_activity_date=None,
            weekly_activity=weekly,
        )
    return StreakResponse(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        last_activity_date=(
            streak.last_activity_date.isoformat() if streak.last_activity_date else None
        ),
        weekly_activity=weekly,
    )


def _build_recent_badges(db: Session, user_id: str, limit: int = 3) -> list[BadgeItem]:
    user_badges = (
        db.query(UserBadge)
        .filter(UserBadge.user_id == user_id)
        .order_by(UserBadge.earned_at.desc())
        .limit(limit)
        .all()
    )
    return [
        BadgeItem(
            badge_id=b.badge_id,
            badge_name=b.badge_name,
            description=b.description,
            icon=b.icon,
            earned_at=b.earned_at.isoformat() if b.earned_at else "",
        )
        for b in user_badges
    ]


def _build_skill_progress(db: Session, user_id: str, path_id: str) -> list[SkillProgressItem]:
    records = (
        db.query(SkillProgress)
        .filter(SkillProgress.user_id == user_id, SkillProgress.path_id == path_id)
        .order_by(SkillProgress.skill_name)
        .all()
    )
    if not records:
        # Legacy/fallback rows with no path scoping
        records = (
            db.query(SkillProgress)
            .filter(SkillProgress.user_id == user_id, SkillProgress.path_id == "")
            .order_by(SkillProgress.skill_name)
            .all()
        )
    return [
        SkillProgressItem(
            skill_name=r.skill_name,
            progress_percentage=r.progress_percentage,
            completed_weight=r.completed_weight,
            total_weight=r.total_weight,
        )
        for r in records
    ]


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    path_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        return DashboardResponse(streak=_build_streak(db, user_id))

    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    }

    learning_path = get_active_path(db, user_id, path_id)
    if not learning_path:
        return DashboardResponse(
            skills=user_skills,
            streak=_build_streak(db, user_id),
            recent_badges=_build_recent_badges(db, user_id),
        )

    select_current_step(db, learning_path)
    nodes = path_nodes(db, learning_path.id)
    stats = path_stats(nodes, learning_path.status)
    ms = stats["milestones"]

    milestone_breakdown: list[MilestoneBreakdown] = [
        MilestoneBreakdown(
            number=num,
            title=milestone_title(num),
            total_steps=d["total"],
            completed_steps=d["completed"] + d["skipped"],
            progress_percentage=d["progress"],
        )
        for num, d in sorted(ms.items())
    ]

    current_node = next((n for n in nodes if n.status == "current"), None)
    if current_node is None:
        current_node = next(
            (n for n in nodes if n.status in ("available", "in_progress")), None
        )
    current_milestone = (
        current_node.milestone_number
        if current_node
        else next(
            (n.milestone_number for n in nodes if n.status not in ("completed", "skipped")),
            stats["total_milestones"] or 0,
        )
    )

    node_responses = {n.id: n for n in nodes}

    # Upcoming steps: valid nodes later in sequence than the current step.
    upcoming: list = []
    if current_node:
        for n in nodes:
            if n.id == current_node.id:
                continue
            if n.status in ("available", "in_progress"):
                upcoming.append(node_responses[n.id])
            if len(upcoming) >= 4:
                break

    skipped_nodes = [n for n in nodes if n.status == "skipped"]
    completed_nodes = [n for n in nodes if n.status == "completed"]

    upcoming_milestones: list[UpcomingMilestone] = []
    for num in sorted(ms.keys()):
        d = ms[num]
        upcoming_milestones.append(UpcomingMilestone(
            number=num,
            title=milestone_title(num),
            total_steps=d["total"],
            completed_steps=d["completed"] + d["skipped"],
            progress_percentage=d["progress"],
            all_done=d["done"],
        ))

    adaptations = (
        db.query(AdaptationEvent)
        .filter(AdaptationEvent.user_id == user_id, AdaptationEvent.path_id == learning_path.id)
        .order_by(AdaptationEvent.created_at.desc())
        .limit(5)
        .all()
    )

    streak = _build_streak(db, user_id)
    completion_date = learning_path.estimated_completion_date

    next_action = None
    if current_node:
        next_action = {
            "resource_id": current_node.resource_id,
            "title": current_node.resource_title,
            "reason": f"Milestone {current_node.milestone_number}, Step {current_node.order_in_milestone}",
            "estimated_hours": current_node.estimated_hours,
        }

    current_step_resp = None
    if current_node:
        current_step_resp = build_node_list([current_node])[0]

    return DashboardResponse(
        path_id=learning_path.id,
        role_label=role_display(learning_path.target_role),
        path_completed=stats["complete"],
        overall_progress=stats["overall_progress"],
        current_milestone=current_milestone,
        milestones_completed=stats["completed_milestones"],
        total_milestones=stats["total_milestones"],
        total_steps=stats["total_steps"],
        skills=user_skills,
        next_action=next_action,
        estimated_completion=(
            completion_date.strftime("%Y-%m-%d") if completion_date else None
        ),
        recent_adaptations=[
            {
                "trigger": a.trigger,
                "explanation": a.explanation,
                "created_at": a.created_at.isoformat() if a.created_at else "",
            }
            for a in adaptations
        ],
        streak=streak,
        recent_badges=_build_recent_badges(db, user_id),
        skill_progress=_build_skill_progress(db, user_id, learning_path.id),
        milestone_breakdown=milestone_breakdown,
        current_step=current_step_resp,
        upcoming_steps=build_node_list(upcoming),
        upcoming_milestones=upcoming_milestones,
        skipped_count=len(skipped_nodes),
        skipped_steps=build_node_list(skipped_nodes),
        completed_count=len(completed_nodes),
        completed_steps=build_node_list(completed_nodes),
    )