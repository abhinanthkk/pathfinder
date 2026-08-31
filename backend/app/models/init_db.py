from sqlalchemy import inspect, text

from app.models.database import engine, Base
from app.models.models import (
    User, LearnerProfile, UserSkill,
    LearningPath, PathNode,
    ProgressEvent, AdaptationEvent,
    ChatMessage,
    UserStreak, UserActivity, UserBadge, SkillProgress, GeneratedRoadmap,
)


def _ensure_column(table: str, column: str, col_type: str = "VARCHAR DEFAULT ''"):
    if "sqlite" not in str(engine.url):
        return
    insp = inspect(engine)
    try:
        columns = {col["name"] for col in insp.get_columns(table)}
    except Exception:
        return
    if column not in columns:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))


def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_column("learning_paths", "target_role")
    _ensure_column("learning_paths", "profile_signature")
    _ensure_column("users", "name")
    _ensure_column("users", "email")
    _ensure_column("users", "password_hash")
    _ensure_column("users", "clerk_user_id", "VARCHAR")
    # PathNode: resources/skills columns for new features
    _ensure_column("path_nodes", "description", "TEXT DEFAULT ''")
    _ensure_column("path_nodes", "skills", "TEXT DEFAULT '[]'")
    _ensure_column("path_nodes", "resources", "TEXT DEFAULT '[]'")
    _ensure_column("path_nodes", "prerequisites", "TEXT DEFAULT '[]'")
    _ensure_column("path_nodes", "domain", "VARCHAR DEFAULT ''")
    # Multi-role support
    _ensure_column("learning_paths", "is_current", "BOOLEAN DEFAULT 0")
    _ensure_column("learning_paths", "is_custom", "BOOLEAN DEFAULT 0")
    _ensure_column("skill_progress", "path_id", "VARCHAR DEFAULT ''")
    _ensure_column("user_badges", "path_id", "VARCHAR DEFAULT ''")
    # Scope progress events to a single learning path
    _ensure_column("progress_events", "path_id", "VARCHAR DEFAULT ''")
