import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, JSON, Integer, Date
from sqlalchemy.orm import relationship
from app.models.database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, default="User")
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    profile = relationship("LearnerProfile", back_populates="user", uselist=False)
    skills = relationship("UserSkill", back_populates="user")
    paths = relationship("LearningPath", back_populates="user")
    progress_events = relationship("ProgressEvent", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
    streak = relationship("UserStreak", back_populates="user", uselist=False)
    activities = relationship("UserActivity", back_populates="user")
    badges = relationship("UserBadge", back_populates="user")
    skill_progress = relationship("SkillProgress", back_populates="user")


class LearnerProfile(Base):
    __tablename__ = "learner_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    goal = Column(String, nullable=False, default="")
    target_role = Column(String, nullable=False, default="")
    interests = Column(JSON, default=list)
    experience_level = Column(String, default="beginner")
    weekly_hours = Column(Float, default=5.0)
    preferred_learning_style = Column(String, default="mixed")
    onboarding_complete = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="profile")


class UserSkill(Base):
    __tablename__ = "user_skills"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    skill_id = Column(String, nullable=False)
    confidence = Column(Float, default=0.0)
    source = Column(String, default="self_reported")
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="skills")


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="active")
    target_role = Column(String, default="")
    profile_signature = Column(String, default="")
    is_current = Column(Boolean, default=False)
    is_custom = Column(Boolean, default=False)
    estimated_completion_date = Column(DateTime, nullable=True)
    total_estimated_hours = Column(Float, default=0.0)
    total_estimated_weeks = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="paths")
    nodes = relationship("PathNode", back_populates="path", order_by="PathNode.milestone_number, PathNode.order_in_milestone")


class PathNode(Base):
    __tablename__ = "path_nodes"

    id = Column(String, primary_key=True, default=generate_uuid)
    path_id = Column(String, ForeignKey("learning_paths.id"), nullable=False)
    resource_id = Column(String, nullable=False)
    resource_title = Column(String, default="")
    description = Column(String, default="")
    milestone_number = Column(Integer, default=1)
    order_in_milestone = Column(Integer, default=1)
    status = Column(String, default="locked")
    estimated_hours = Column(Float, default=0.0)
    skills = Column(JSON, default=list)
    resources = Column(JSON, default=list)
    prerequisites = Column(JSON, default=list)
    domain = Column(String, default="")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    path = relationship("LearningPath", back_populates="nodes")


class ProgressEvent(Base):
    __tablename__ = "progress_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    resource_id = Column(String, nullable=False)
    old_status = Column(String, default="locked")
    new_status = Column(String, nullable=False)
    skill_changes = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="progress_events")


class AdaptationEvent(Base):
    __tablename__ = "adaptation_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False)
    path_id = Column(String, nullable=False)
    trigger = Column(String, nullable=False)
    explanation = Column(String, default="")
    nodes_added = Column(JSON, default=list)
    nodes_removed = Column(JSON, default=list)
    nodes_reordered = Column(JSON, default=list)
    created_at = Column(DateTime, default=utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="chat_messages")


class UserStreak(Base):
    __tablename__ = "user_streaks"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="streak")


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    activity_date = Column(Date, nullable=False)
    activity_type = Column(String, default="step_completed")
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="activities")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    badge_id = Column(String, nullable=False)
    badge_name = Column(String, nullable=False)
    description = Column(String, default="")
    icon = Column(String, default="🏆")
    path_id = Column(String, nullable=False, default="")
    earned_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="badges")


class SkillProgress(Base):
    __tablename__ = "skill_progress"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    path_id = Column(String, nullable=False, default="")
    skill_name = Column(String, nullable=False)
    progress_percentage = Column(Float, default=0.0)
    completed_weight = Column(Float, default=0.0)
    total_weight = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="skill_progress")


class GeneratedRoadmap(Base):
    """Stores AI-generated roadmaps for custom domains not in skills.yaml"""
    __tablename__ = "generated_roadmaps"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False)
    goal = Column(String, nullable=False)
    roadmap_data = Column(JSON, nullable=False)  # Full structured roadmap
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow)
