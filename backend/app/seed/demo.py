import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.database import SessionLocal
from app.models.models import User, LearnerProfile, UserSkill, LearningPath, PathNode
from app.services.skill_graph import get_skill_graph


DEMO_USER_ID = "demo-user-001"


def seed_demo_user(db: Session):
    existing = db.query(User).filter(User.id == DEMO_USER_ID).first()
    if existing:
        return DEMO_USER_ID

    user = User(id=DEMO_USER_ID)
    db.add(user)
    db.flush()

    profile = LearnerProfile(
        user_id=DEMO_USER_ID,
        goal="Become a Backend Developer",
        target_role="backend_developer",
        interests=["web development", "APIs", "system design"],
        experience_level="intermediate",
        weekly_hours=6.0,
        preferred_learning_style="project",
        onboarding_complete=True,
    )
    db.add(profile)

    demo_skills = {
        "python_basics": 0.7,
        "sql_basics": 0.3,
        "git_basics": 0.2,
        "http_basics": 0.4,
    }

    for skill_id, confidence in demo_skills.items():
        skill = UserSkill(
            user_id=DEMO_USER_ID,
            skill_id=skill_id,
            confidence=confidence,
            source="self_reported",
        )
        db.add(skill)

    db.commit()
    return DEMO_USER_ID


def run_seed():
    from app.models.init_db import init_db
    init_db()

    db = SessionLocal()
    try:
        user_id = seed_demo_user(db)
        print(f"Demo user seeded: {user_id}")

        sg = get_skill_graph()
        print(f"Skills loaded: {len(sg.skills)}")
        print(f"Goals loaded: {len(sg.goals)}")
        print(f"Resources loaded: {len(sg.resources)}")
        print(f"Has cycle: {sg.has_cycle()}")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
