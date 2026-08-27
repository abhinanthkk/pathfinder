from sqlalchemy import inspect, text

from app.models.database import engine, Base
from app.models.models import (
    User, LearnerProfile, UserSkill,
    LearningPath, PathNode,
    ProgressEvent, AdaptationEvent,
    ChatMessage
)


def _ensure_column(table: str, column: str):
    if "sqlite" not in str(engine.url):
        return
    insp = inspect(engine)
    columns = {col["name"] for col in insp.get_columns(table)}
    if column not in columns:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} VARCHAR DEFAULT ''"))


def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_column("learning_paths", "target_role")
    _ensure_column("learning_paths", "profile_signature")
    _ensure_column("users", "name")
    _ensure_column("users", "email")
    _ensure_column("users", "password_hash")
