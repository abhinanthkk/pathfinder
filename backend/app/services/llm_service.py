from __future__ import annotations
import json
import logging
import yaml
from pathlib import Path
from typing import Optional

from app.core.config import NVIDIA_API_KEY, NVIDIA_MODEL, NVIDIA_BASE_URL

logger = logging.getLogger(__name__)

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"

_prompts: Optional[dict] = None


def _load_prompts() -> dict:
    global _prompts
    if _prompts is None:
        path = CONFIG_DIR / "prompts.yaml"
        with open(path) as f:
            data = yaml.safe_load(f)
        _prompts = data.get("prompts", data)
    return _prompts


async def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.3, timeout: float = 90.0) -> str:
    if not NVIDIA_API_KEY or NVIDIA_API_KEY == "your_nvidia_api_key_here":
        raise ValueError("NVIDIA API key not configured")

    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NVIDIA_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": NVIDIA_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": 2048,
            },
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


def _extract_json_from_text(text: str) -> Optional[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i+1])
                except json.JSONDecodeError:
                    return None
    return None


async def extract_profile_from_message(
    message: str,
    available_skills: list[str],
    available_goals: list[str],
) -> Optional[dict]:
    prompts = _load_prompts()
    system = prompts["profile_extraction_system"]
    user = prompts["profile_extraction"].format(
        message=message,
        available_skills=", ".join(available_skills[:30]),
        available_goals=", ".join(available_goals),
    )

    try:
        raw = await call_llm(system, user, temperature=0.2, timeout=25.0)
        return _extract_json_from_text(raw)
    except json.JSONDecodeError:
        logger.warning("Failed to parse LLM profile extraction as JSON")
        return None
    except Exception as e:
        logger.error(f"Profile extraction failed: {e}")
        return None


async def generate_followup_question(current_profile: dict, missing_fields: list[str]) -> str:
    prompts = _load_prompts()
    user = prompts["followup_question"].format(
        current_profile=json.dumps(current_profile, indent=2),
        missing_fields=", ".join(missing_fields),
    )
    system = "You are a friendly AI learning advisor. Ask one question at a time. Be conversational and specific."

    try:
        return await call_llm(system, user, temperature=0.7, timeout=20.0)
    except Exception as e:
        logger.warning(f"Followup question generation failed: {e}")
        if "goal" in missing_fields:
            return "What's your main learning goal? For example, do you want to become a backend developer, data scientist, or frontend developer?"
        if "skills" in missing_fields:
            return "What skills do you already have? For example, do you know Python, SQL, or JavaScript?"
        if "weekly_hours" in missing_fields:
            return "How many hours per week can you dedicate to learning?"
        if "preferred_learning_style" in missing_fields:
            return "Do you prefer learning through videos, reading, hands-on projects, or a mix of everything?"
        return "Is there anything else you'd like to tell me about your learning preferences?"


async def generate_profile_confirmation(profile: dict) -> str:
    prompts = _load_prompts()
    user = prompts["profile_confirmation"].format(
        profile=json.dumps(profile, indent=2)
    )
    system = "You are a friendly AI learning advisor. Confirm the learner's profile clearly."

    try:
        return await call_llm(system, user, temperature=0.5, timeout=20.0)
    except Exception as e:
        logger.warning(f"Profile confirmation generation failed: {e}")
        goal = profile.get("goal", "your goal")
        return f"Great! I understand you want to achieve: {goal}. I've saved your profile and will now create your personalized learning path."


async def generate_explanation(
    goal: str,
    skills: dict,
    gaps: dict,
    resource_title: str,
    resource_description: str,
    resource_skills: list,
    prerequisites: list,
    prereq_status: dict,
    score_breakdown: dict,
    timeout: float = 10.0,
) -> str:
    prompts = _load_prompts()
    user = prompts["explanation_template"].format(
        goal=goal,
        skills=json.dumps(skills, indent=2),
        gaps=json.dumps(gaps, indent=2),
        resource_title=resource_title,
        resource_description=resource_description,
        resource_skills=", ".join(resource_skills),
        prerequisites=", ".join(prerequisites),
        prereq_status=json.dumps(prereq_status, indent=2),
        score_breakdown=json.dumps(score_breakdown, indent=2),
    )
    system = (
        "You are a learning advisor. Write a clear, personalized explanation "
        "(2-4 sentences) of why this learning resource was recommended for THIS "
        "specific learner. Reference their actual goal and current skills. "
        "Answer directly with the explanation only - do not include reasoning, "
        "thinking, or section headers."
    )

    try:
        return await call_llm(system, user, temperature=0.5, timeout=timeout)
    except Exception as e:
        logger.warning(f"Explanation generation failed/timed out: {e}")
        raise


async def generate_adaptation_explanation(
    trigger: str,
    resource_title: str,
    resource_skills: list,
    skill_changes: dict,
    goal: str,
) -> str:
    prompts = _load_prompts()
    user = prompts["adaptation_template"].format(
        trigger=trigger,
        resource_title=resource_title,
        resource_skills=", ".join(resource_skills),
        skill_changes=json.dumps(skill_changes, indent=2),
        goal=goal,
    )
    system = "You are a learning advisor explaining why a learning path changed. Be clear and encouraging."

    try:
        return await call_llm(system, user, temperature=0.5)
    except Exception as e:
        logger.warning(f"Adaptation explanation failed: {e}")
        if trigger == "course_completed":
            return f"Completed '{resource_title}'. Your skills have been updated and dependent topics are now unlocked."
        elif trigger == "assessment_failed":
            return f"Failed '{resource_title}'. Your confidence has been reduced. Consider reviewing the material before retrying."
        return "Your learning path has been updated based on your progress."


async def build_personalized_fallback_explanation(
    goal: str,
    skills: dict,
    gaps: dict,
    resource_title: str,
    resource_description: str,
    resource_skills: list,
    prerequisites: list,
    prereq_status: dict,
    unlocks: list[str] = None,
    previous_items: list[str] = None,
) -> str:
    """Deterministic, data-grounded explanation used when the LLM is slow/unavailable."""
    parts = [f"“{resource_title}” was recommended for your goal: {goal}."]

    gap_skills = [s for s in resource_skills if s in gaps]
    if gap_skills:
        parts.append(
            f"It directly helps you close a skill gap you still need to reach your goal: {', '.join(gap_skills)}."
        )

    met = [p for p in prerequisites if prereq_status.get(p) == "met"]
    unmet = [p for p in prerequisites if prereq_status.get(p) == "not met"]
    if met:
        parts.append(
            f"You already have a foundation in {', '.join(met)}, so this step is a natural next move."
        )
    if unmet:
        parts.append(
            f"Be aware it builds on {', '.join(unmet)} — be ready to review those if needed."
        )

    if unlocks:
        parts.append(
            f"Completing it unlocks what comes next: {', '.join(unlocks[:4])}."
        )

    desc = (resource_description or "").strip()
    if desc:
        parts.append(desc[:240].rstrip() + ("…" if len(desc) > 240 else "."))

    return "\n\n".join(parts)


async def answer_learner_question(
    question: str,
    profile: dict,
    current_path: dict,
    current_node: dict | None,
) -> str:
    prompts = _load_prompts()
    user = prompts["learner_qa_template"].format(
        question=question,
        profile=json.dumps(profile, indent=2),
        current_path=json.dumps(current_path, indent=2) if current_path else "No path generated yet",
        current_node=json.dumps(current_node, indent=2) if current_node else "No specific resource selected",
    )
    system = (
        "You are a helpful AI learning assistant for the Pathfinder platform. "
        "Answer the learner's question about their learning journey. "
        "Be specific, reference their actual profile and path when relevant. "
        "If they ask about skipping a topic, explain the implications. "
        "If they ask about time changes, explain how it affects their timeline."
    )

    try:
        return await call_llm(system, user, temperature=0.6)
    except Exception as e:
        logger.warning(f"Learner Q&A failed: {e}")
        return "I'm sorry, I'm having trouble processing your question right now. Please try again later."
