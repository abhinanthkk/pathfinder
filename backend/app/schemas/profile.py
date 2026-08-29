from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class ChatMessage(BaseModel):
    user_id: Optional[str] = None
    message: str
    conversation_history: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    type: str = "chat"  # chat | explanation | roadmap_generation | path_update
    reply: str
    reasons: list[str] = Field(default_factory=list)
    extracted_profile: Optional[dict] = None
    profile_complete: bool = False


class ProfileCreate(BaseModel):
    user_id: Optional[str] = None
    goal: str = ""
    target_role: str = ""
    interests: list[str] = Field(default_factory=list)
    experience_level: str = "beginner"
    weekly_hours: float = 5.0
    preferred_learning_style: str = "mixed"
    skills: dict[str, float] = Field(default_factory=dict)


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    goal: str
    target_role: str
    interests: list[str]
    experience_level: str
    weekly_hours: float
    preferred_learning_style: str
    onboarding_complete: bool
    skill_gaps: dict[str, float] = Field(default_factory=dict)
    user_skills: dict[str, float] = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    user_id: Optional[str] = None
    limit: int = 10


class ScoreBreakdown(BaseModel):
    semantic_similarity: float = 0.0
    skill_gap_relevance: float = 0.0
    prerequisite_readiness: float = 0.0
    difficulty_fit: float = 0.0
    format_preference: float = 0.0


class RecommendationItem(BaseModel):
    resource_id: str
    title: str
    description: str = ""
    domain: str = ""
    skills: list[str] = Field(default_factory=list)
    difficulty: str = ""
    estimated_hours: float = 0.0
    format: str = ""
    score: float = 0.0
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    prerequisites_met: bool = True
    reason: str = ""


class RecommendationResponse(BaseModel):
    recommendations: list[RecommendationItem] = Field(default_factory=list)


class PathRequest(BaseModel):
    user_id: Optional[str] = None


# --- Resource schema for path nodes ---
class ResourceItem(BaseModel):
    title: str
    type: str = "article"   # youtube | article | docs
    url: str
    source: str = ""


class PathNodeResponse(BaseModel):
    node_id: str
    resource_id: str
    title: str
    description: str = ""
    status: str
    estimated_hours: float
    milestone: int
    order: int
    skills: list[str] = Field(default_factory=list)
    resources: list[ResourceItem] = Field(default_factory=list)


class MilestoneResponse(BaseModel):
    number: int
    title: str
    description: str = ""
    estimated_hours: float
    estimated_weeks: float
    estimated_start_date: Optional[str] = None
    estimated_end_date: Optional[str] = None
    nodes: list[PathNodeResponse] = Field(default_factory=list)


class PathResponse(BaseModel):
    path_id: str
    milestones: list[MilestoneResponse] = Field(default_factory=list)
    total_estimated_hours: float = 0.0
    total_estimated_weeks: float = 0.0
    estimated_completion_date: Optional[str] = None


class ExplainRequest(BaseModel):
    user_id: Optional[str] = None
    resource_id: str
    context: str = "roadmap_node"


class ExplainResponse(BaseModel):
    explanation: str
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    skill_gaps_addressed: list[str] = Field(default_factory=list)
    prerequisites_status: dict[str, str] = Field(default_factory=dict)


class ProgressRequest(BaseModel):
    user_id: Optional[str] = None
    resource_id: str
    status: str
    notes: str = ""


class SkillChange(BaseModel):
    old: float
    new: float


class ProgressResponse(BaseModel):
    updated_node: Optional[PathNodeResponse] = None
    skill_changes: dict[str, SkillChange] = Field(default_factory=dict)
    path_changed: bool = False
    adaptation: Optional[dict] = None
    streak: Optional[dict] = None
    new_badges: list[dict] = Field(default_factory=list)
    milestone_completed: Optional[int] = None


# --- Streak schemas ---
class DayActivity(BaseModel):
    date: str
    active: bool


class StreakResponse(BaseModel):
    current_streak: int = 0
    longest_streak: int = 0
    last_activity_date: Optional[str] = None
    weekly_activity: list[DayActivity] = Field(default_factory=list)


class ActivityRequest(BaseModel):
    activity_type: str = "step_completed"


# --- Badge schemas ---
class BadgeItem(BaseModel):
    badge_id: str
    badge_name: str
    description: str
    icon: str
    earned_at: str


class BadgesResponse(BaseModel):
    badges: list[BadgeItem] = Field(default_factory=list)


class MilestoneCheckRequest(BaseModel):
    milestone_number: int


class MilestoneCheckResponse(BaseModel):
    milestone_complete: bool
    new_badges: list[BadgeItem] = Field(default_factory=list)
    message: str = ""


# --- Skill progress schemas ---
class SkillProgressItem(BaseModel):
    skill_name: str
    progress_percentage: float
    completed_weight: float
    total_weight: float


class SkillProgressResponse(BaseModel):
    skills: list[SkillProgressItem] = Field(default_factory=list)


# --- Dashboard schema (enhanced) ---
class MilestoneBreakdown(BaseModel):
    number: int
    title: str
    total_steps: int
    completed_steps: int
    progress_percentage: float


class UpcomingMilestone(BaseModel):
    number: int
    title: str
    total_steps: int
    completed_steps: int
    progress_percentage: float
    all_done: bool = False


class DashboardResponse(BaseModel):
    path_id: str = ""
    role_label: str = ""
    path_completed: bool = False
    overall_progress: float = 0.0
    current_milestone: int = 0
    milestones_completed: int = 0
    total_milestones: int = 0
    total_steps: int = 0
    skills: dict[str, float] = Field(default_factory=dict)
    next_action: Optional[dict] = None
    estimated_completion: Optional[str] = None
    recent_adaptations: list[dict] = Field(default_factory=list)
    # New enriched fields
    streak: Optional[StreakResponse] = None
    recent_badges: list[BadgeItem] = Field(default_factory=list)
    skill_progress: list[SkillProgressItem] = Field(default_factory=list)
    milestone_breakdown: list[MilestoneBreakdown] = Field(default_factory=list)
    # Current / upcoming / history
    current_step: Optional[PathNodeResponse] = None
    upcoming_steps: list[PathNodeResponse] = Field(default_factory=list)
    upcoming_milestones: list[UpcomingMilestone] = Field(default_factory=list)
    skipped_count: int = 0
    skipped_steps: list[PathNodeResponse] = Field(default_factory=list)
    completed_count: int = 0
    completed_steps: list[PathNodeResponse] = Field(default_factory=list)


# --- Multi-role goal schemas ---
class PathSummary(BaseModel):
    path_id: str
    target_role: str = ""
    role_label: str = ""
    is_current: bool = False
    is_custom: bool = False
    status: str = "active"
    progress_percentage: float = 0.0
    completed_steps: int = 0
    skipped_steps: int = 0
    total_steps: int = 0
    current_milestone: int = 0
    current_milestone_title: str = ""
    current_step_title: str = ""
    completed_milestones: int = 0
    total_milestones: int = 0
    path_completed: bool = False
    estimated_completion_date: Optional[str] = None


class GoalsResponse(BaseModel):
    active_path_id: str = ""
    goals: list[PathSummary] = Field(default_factory=list)


class OnboardingStatusResponse(BaseModel):
    needs_onboarding: bool = True
    onboarding_complete: bool = False
    active_goals: int = 0
    max_goals: int = 2


class GoalCreate(BaseModel):
    target_role: str = ""
    goal: str = ""
    is_custom: bool = False
    experience_level: str = "beginner"
    weekly_hours: float = 5.0
    preferred_learning_style: str = "mixed"
    skills: dict[str, float] = Field(default_factory=dict)


class GoalCreateResponse(BaseModel):
    path: PathResponse
    goals: GoalsResponse


# --- Roadmap generation schemas ---
class RoadmapGenerateRequest(BaseModel):
    goal: str = ""
    target_role: str = ""
    experience_level: str = "beginner"
    weekly_hours: float = 5.0
    skills: dict[str, float] = Field(default_factory=dict)
    learning_style: str = "mixed"
