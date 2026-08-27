from __future__ import annotations
from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import UserSkill
from app.services.skill_graph import get_skill_graph
from app.schemas.profile import RecommendationItem, ScoreBreakdown, RecommendationResponse

DIFFICULTY_MAP = {"beginner": 1, "intermediate": 2, "advanced": 3}
EXPERIENCE_MAP = {"beginner": 1, "intermediate": 2, "advanced": 3}
FORMAT_MAP = {"video": 0, "text": 1, "project": 2, "mixed": 3, "assessment": 4}

SIMPLE_KEYWORD_SIMILARITY = True


def _keyword_similarity(goal_text: str, resource: dict) -> float:
    goal_words = set(goal_text.lower().split())
    res_words = set(resource.get("title", "").lower().split()) | set(resource.get("description", "").lower().split())
    skill_words = set(s.lower().replace("_", " ") for s in resource.get("skills", []))
    all_res_words = res_words | skill_words
    if not goal_words:
        return 0.0
    overlap = goal_words & all_res_words
    return min(1.0, len(overlap) / max(1, len(goal_words) * 0.5))


def _skill_gap_relevance(resource_skills: list[str], gaps: dict[str, float]) -> float:
    if not gaps:
        return 0.0
    relevant = [s for s in resource_skills if s in gaps]
    if not relevant:
        return 0.0
    total_gap_value = sum(gaps[s] for s in relevant)
    max_possible = sum(gaps.values())
    return min(1.0, total_gap_value / max_possible) if max_possible > 0 else 0.0


def _prerequisite_readiness(resource: dict, user_skills: dict[str, float], threshold: float = 0.3) -> float:
    prereqs = resource.get("prerequisites", [])
    if not prereqs:
        return 1.0
    met = sum(1 for p in prereqs if user_skills.get(p, 0.0) >= threshold)
    return met / len(prereqs)


def _difficulty_fit(resource: dict, experience_level: str) -> float:
    res_diff = DIFFICULTY_MAP.get(resource.get("difficulty", "beginner"), 1)
    user_level = EXPERIENCE_MAP.get(experience_level, 1)
    diff = abs(res_diff - user_level)
    return max(0.0, 1.0 - diff / 3.0)


def _format_preference(resource: dict, preferred_style: str) -> float:
    res_format = resource.get("format", "mixed")
    if preferred_style == "mixed":
        return 0.7
    if res_format == preferred_style:
        return 1.0
    if preferred_style == "project" and res_format == "project":
        return 1.0
    if preferred_style == "video" and res_format in ("video", "mixed"):
        return 0.8
    if preferred_style == "text" and res_format in ("text", "mixed"):
        return 0.8
    return 0.4


def compute_recommendation_scores(
    user_skills: dict[str, float],
    goal_text: str,
    target_role: str,
    experience_level: str,
    preferred_style: str,
    gaps: dict[str, float],
    exclude_ids: Optional[set[str]] = None,
) -> list[RecommendationItem]:
    sg = get_skill_graph()
    exclude_ids = exclude_ids or set()
    results = []

    for rid, resource in sg.resources.items():
        if rid in exclude_ids:
            continue

        sem_sim = _keyword_similarity(goal_text, resource)
        gap_rel = _skill_gap_relevance(resource.get("skills", []), gaps)
        prereq_ready = _prerequisite_readiness(resource, user_skills)
        diff_fit = _difficulty_fit(resource, experience_level)
        fmt_pref = _format_preference(resource, preferred_style)

        final_score = (
            0.35 * sem_sim
            + 0.25 * gap_rel
            + 0.20 * prereq_ready
            + 0.10 * diff_fit
            + 0.10 * fmt_pref
        )

        if gap_rel < 0.01 and sem_sim < 0.1:
            continue

        results.append(RecommendationItem(
            resource_id=rid,
            title=resource.get("title", ""),
            description=resource.get("description", ""),
            domain=resource.get("domain", ""),
            skills=resource.get("skills", []),
            difficulty=resource.get("difficulty", ""),
            estimated_hours=resource.get("estimated_hours", 0),
            format=resource.get("format", ""),
            score=round(final_score, 4),
            score_breakdown=ScoreBreakdown(
                semantic_similarity=round(sem_sim, 4),
                skill_gap_relevance=round(gap_rel, 4),
                prerequisite_readiness=round(prereq_ready, 4),
                difficulty_fit=round(diff_fit, 4),
                format_preference=round(fmt_pref, 4),
            ),
            prerequisites_met=prereq_ready >= 1.0,
        ))

    results.sort(key=lambda r: r.score, reverse=True)
    return results


def get_recommendations(
    db: Session,
    user_id: str,
    limit: int = 10,
) -> RecommendationResponse:
    from app.models.models import LearnerProfile

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        return RecommendationResponse(recommendations=[])

    sg = get_skill_graph()

    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    }

    goal_skills = sg.get_goal_skills(profile.target_role)
    gaps = {
        skill: max(0.0, required - user_skills.get(skill, 0.0))
        for skill, required in goal_skills.items()
        if user_skills.get(skill, 0.0) < required
    }

    completed = set()
    from app.models.models import PathNode, LearningPath
    path = db.query(LearningPath).filter(
        LearningPath.user_id == user_id,
        LearningPath.status == "active",
    ).first()
    if path:
        completed = {
            n.resource_id for n in path.nodes
            if n.status in ("completed", "skipped")
        }

    all_recs = compute_recommendation_scores(
        user_skills=user_skills,
        goal_text=profile.goal,
        target_role=profile.target_role,
        experience_level=profile.experience_level,
        preferred_style=profile.preferred_learning_style,
        gaps=gaps,
        exclude_ids=completed,
    )

    for rec in all_recs[:limit]:
        gap_skills = [s for s in rec.skills if s in gaps]
        prereqs = sg.get_prerequisites_on_resource(rec.resource_id)
        rec.reason = _build_reason(rec, gap_skills, prereqs, profile.goal)

    return RecommendationResponse(recommendations=all_recs[:limit])


def _build_reason(rec: RecommendationItem, gap_skills: list[str], prereqs: list[str], goal: str) -> str:
    parts = []
    if gap_skills:
        parts.append(f"Covers skills you need: {', '.join(gap_skills)}")
    if prereqs:
        parts.append(f"Builds on prerequisites: {', '.join(prereqs)}")
    parts.append(f"Relevant to your goal: {goal}")
    return ". ".join(parts) + "."
