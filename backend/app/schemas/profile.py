from pydantic import BaseModel, Field
from typing import Optional


class ChatMessage(BaseModel):
    user_id: Optional[str] = None
    message: str
    conversation_history: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
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


class PathNodeResponse(BaseModel):
    node_id: str
    resource_id: str
    title: str
    status: str
    estimated_hours: float
    milestone: int
    order: int


class MilestoneResponse(BaseModel):
    number: int
    title: str
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


class DashboardResponse(BaseModel):
    overall_progress: float = 0.0
    current_milestone: int = 0
    milestones_completed: int = 0
    total_milestones: int = 0
    skills: dict[str, float] = Field(default_factory=dict)
    next_action: Optional[dict] = None
    estimated_completion: Optional[str] = None
    recent_adaptations: list[dict] = Field(default_factory=list)
