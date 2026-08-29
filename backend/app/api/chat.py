import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import User, LearnerProfile, UserSkill, LearningPath, PathNode, ChatMessage as DBChatMessage
from app.schemas.profile import ChatMessage, ChatResponse
from app.core.auth import get_current_user
from app.services.skill_graph import get_skill_graph
from app.services.llm_service import extract_profile_from_message
from app.services.path_generator import generate_learning_path

router = APIRouter(tags=["chat"])

GOAL_KEYWORDS = {
    "backend": "backend_developer",
    "data scien": "data_scientist",
    "data analyst": "data_scientist",
    "data": "data_scientist",
    "frontend": "frontend_developer",
    "front end": "frontend_developer",
    "ui/ux": "data_scientist",  # fallback; not a real goal here
    "ui": "",  # handled below
    "ml": "data_scientist",
    "machine learning": "data_scientist",
}

SKILL_KEYWORDS = [
    ("python", "python_basics"),
    ("sql", "sql_basics"),
    ("javascript", "javascript_basics"),
    ("react", "react_basics"),
    ("git", "git_basics"),
    ("docker", "docker_basics"),
    ("fastapi", "fastapi"),
    ("api", "rest_apis"),
    ("statistics", "statistics"),
    ("statistic", "statistics"),
    ("numpy", "numpy"),
    ("pandas", "pandas"),
    ("machine learning", "ml"),
    ("ml", "ml"),
    ("data analysis", "pandas"),
    ("data viz", "data_viz"),
    ("data visualization", "data_viz"),
    ("oop", "oop"),
    ("html", "html_basics"),
    ("css", "css_basics"),
    ("typescript", "typescript"),
    ("aws", "cloud"),
    ("cloud", "cloud"),
    ("django", "django"),
    ("flask", "flask"),
]

RULE_SKILL_CONF = 0.5
INFER_CONF = 0.4


@router.post("/chat", response_model=ChatResponse)
async def chat(data: ChatMessage, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    user = _get_or_create_user(db, user_id)
    profile = _get_or_create_profile(db, user_id)
    sg = get_skill_graph()

    msg = data.message.strip()
    
    # Save user message
    db.add(DBChatMessage(user_id=user_id, role="user", content=msg))
    db.commit()

    intent = _classify_intent(msg)
    current = _snapshot_profile(db, user_id)

    # 1) Greetings / help → conversational short reply, keep collecting
    if intent == "greeting":
        reply = (
            "Hi! I'm your AI learning advisor. I can help you build a personalized "
            "learning roadmap. Tell me what you'd like to become (e.g. a backend "
            "developer or data scientist) and what you already know."
        )
        return ChatResponse(type="chat", reply=reply, extracted_profile=current, profile_complete=False)

    # 2) General / learning questions → answer with real data (fast), no roadmap regen
    if intent == "question":
        answer = _answer_question(msg, db, sg, user_id)
        _save_assistant_reply(db, user_id, answer)
        # Detect if this is an explanation request (why/explain/reason)
        is_explanation = bool(re.search(r"\b(why|explain|reason|because|what is|what's|define|tell me about)\b", msg.lower()))
        if is_explanation:
            reasons = _extract_reasons(answer)
            return ChatResponse(
                type="explanation",
                reply=answer,
                reasons=reasons,
                extracted_profile=current,
                profile_complete=False,
            )
        return ChatResponse(type="chat", reply=answer, extracted_profile=current, profile_complete=False)

    # 3) Roadmap generation request → build path if profile is usable
    if intent == "generate_roadmap":
        current = _snapshot_profile(db, user_id)
        missing = _find_missing_fields(current, sg)
        if missing and not _profile_has_baseline(current):
            reply = (
                "I'd love to, but I still need a bit more from you to build the best "
                f"roadmap. Could you tell me: {', '.join(m.replace('_', ' ').upper() for m in missing)}?"
            )
            _save_assistant_reply(db, user_id, reply)
            return ChatResponse(type="chat", reply=reply, extracted_profile=current, profile_complete=False)

        response = _generate_and_reply(db, user_id, current)
        _save_assistant_reply(db, user_id, response.reply)
        return response

    # 4) Roadmap modification (time / scope) → update profile + regenerate
    if intent == "modify_roadmap":
        modified = _apply_modification(msg, db, user_id, sg)
        response = _generate_and_reply(
            db, user_id, _snapshot_profile(db, user_id), modified_note=modified
        )
        _save_assistant_reply(db, user_id, response.reply)
        return response

    # 5) Default: extract profile info from the message
    extracted = await _extract_profile(msg, sg, data)
    if extracted:
        _apply_extraction(db, user_id, extracted, profile, sg)

    current = _snapshot_profile(db, user_id)
    missing = _find_missing_fields(current, sg)

    if not missing:
        profile.onboarding_complete = True
        db.commit()
        reply = _confirm_profile(current)
        _save_assistant_reply(db, user_id, reply)
        return ChatResponse(
            type="chat",
            reply=reply,
            extracted_profile=current,
            profile_complete=True,
        )

    followup = _ask_followup(missing)
    _save_assistant_reply(db, user_id, followup)
    return ChatResponse(type="chat", reply=followup, extracted_profile=current, profile_complete=False)


# ---------------------------------------------------------------------------
# Intent classification (deterministic, instant)
# ---------------------------------------------------------------------------
def _classify_intent(msg):
    low = msg.lower().strip()

    if re.search(r"^(hi|hello|hey|yo|thanks|thank you|what can you do|help)\b", low) and len(low) < 40:
        return "greeting"

    gen = re.search(r"(create|generate|build|make|show me|give me).{0,30}(roadmap|learning path|path|plan|road map)", low)
    if gen:
        return "generate_roadmap"

    mod = re.search(r"(only|just|now|want|need)\b.{0,25}\b(hours?|hrs?|per week|a week|weekly)\b", low) or \
          re.search(r"(shorter|easier|simpler|remove advanced|less time|reduce)", low)
    if mod:
        return "modify_roadmap"

    # Question detection: starts with interrogative or ends with "?"
    if low.rstrip().endswith("?") or re.match(r"^(what|how|why|can|which|when|is|are|do|does|should|could|will|would)\b", low):
        return "question"

    return "profile"


# ---------------------------------------------------------------------------
# Fast, data-grounded Q&A
# ---------------------------------------------------------------------------
def _answer_question(msg, db, sg, user_id):
    low = msg.lower()
    profile = _snapshot_profile(db, user_id)
    goal_label = profile.get("goal") or (profile.get("target_role") or "").replace("_", " ").title()

    # "what is X?" → find resource/skill by title keyword
    topic = _extract_topic(msg)
    if "what is" in low or "what's" in low or "explain" in low or "define" in low or "tell me about" in low:
        if topic:
            desc = _describe_topic(topic, sg)
            if desc:
                return desc

    # "why should I learn / why is X included / why do I need X"
    if re.search(r"why.*(learn|included|need|study|take|do i)", low) or re.search(r"why.*\?", low):
        if topic:
            return _why_included(topic, sg, profile, goal_label, db, user_id)

    # "can I skip X?"
    if re.search(r"(can|should) i (skip|drop|remove)", low) and topic:
        return _skip_topic(topic, sg, profile, goal_label, db, user_id)

    # "what's the difference between X and Y?"
    if "difference between" in low:
        pair = _extract_pair(low)
        if pair:
            return _difference(pair, sg, goal_label)

    # general "what should I learn next?"
    if "learn next" in low or "next step" in low or "start" in low:
        return _next_step(sg, profile, goal_label, db, user_id)

    # generic fallback grounded in goal
    if goal_label:
        return (
            f"That's a good question about your learning journey toward {goal_label}. "
            "If you tell me which specific topic you'd like to know more about — like a "
            "skill or roadmap step — I can explain whether and why it's part of your plan."
        )
    return (
        "I can answer questions about any topic on your learning path. What would you "
        "like to know more about?"
    )


def _extract_topic(msg):
    low = msg.lower()
    m = re.search(r"(?:what is|what's|explain|define|tell me about|skip|learn|why)\s+([a-z0-9 _\-]+?)(?:\?|\.|$| included| in my)", low)
    if m:
        return m.group(1).strip().strip("?.")
    return None


def _extract_pair(low):
    m = re.search(r"difference between\s+(.+?)\s+and\s+(.+?)(?:\?|$)", low)
    if m:
        return (m.group(1).strip(), m.group(2).strip())
    return None


def _describe_topic(topic, sg):
    res = _match_resource(topic, sg)
    if res:
        skills = ", ".join(_name(sg, s) for s in res.get("skills", []))
        prereqs = ", ".join(_name(sg, p) for p in res.get("prerequisites", [])) or "none"
        return (
            f"{res.get('title')}. {res.get('description', '').strip()}\n"
            f"Skills it covers: {skills or 'n/a'}.\n"
            f"Prerequisites: {prereqs}. Estimated time: {res.get('estimated_hours', '?')}h."
        )
    skill = _match_skill(topic, sg)
    if skill:
        name = (skill.get("name") or "").replace("_", " ").title()
        return f"{name} is a core skill in your learning path. Tell me which step you'd like me to focus on and I'll explain it in context."
    return None


def _why_included(topic, sg, profile, goal_label, db, user_id):
    res = _match_resource(topic, sg)
    if not res:
        sk = _match_skill(topic, sg)
        if sk and goal_label:
            return f"Because it supports your goal of becoming a {goal_label} — {_name(sg, sk.get('id', topic))} is one of the skills you'll need."
        return f"I can explain why '{topic}' is relevant if you'd like — is it on your current roadmap or something you're considering?"
    skills = ", ".join(_name(sg, s) for s in res.get("skills", []))
    # check if it's on the user's path
    on_path = _resource_on_path(db, user_id, res.get("id"))
    why = f"{res.get('title')} is included"
    if on_path:
        why += " in your roadmap"
    why += (
        f" because it moves you toward your goal of {goal_label or 'your career goal'}. "
        f"It teaches: {skills or 'key skills'}, which are needed for that goal."
    )
    if res.get("prerequisites"):
        why += f" It builds on {', '.join(_name(sg, p) for p in res.get('prerequisites', []))}."
    return why


def _skip_topic(topic, sg, profile, goal_label, db, user_id):
    res = _match_resource(topic, sg)
    deps = _find_dependents(topic, sg)
    name = res.get("title", topic) if res else _title_cap(topic)
    if deps:
        return (
            f"You can decide to skip '{name}', but note that it's a prerequisite for "
            f"these later steps: {', '.join(deps[:4])}. Skipping it may make those harder. "
            "I can mark it as skipped on your roadmap if you'd like."
        )
    return (
        f"'{name}' helps support your goal. You can skip any step, but I'd recommend "
        "completing it since future topics lean on it. Want me to adjust your roadmap?"
    )


def _difference(pair, sg, goal_label):
    a = _match_resource(pair[0], sg) or {}
    b = _match_resource(pair[1], sg) or {}
    a_name = a.get("title", _title_cap(pair[0]))
    b_name = b.get("title", _title_cap(pair[1]))
    a_desc = (a.get("description") or f"{a_name} is a learning step on your path.").strip()
    b_desc = (b.get("description") or f"{b_name} is another learning step on your path.").strip()
    return (
        f"{a_name}: {a_desc}\n\n{b_name}: {b_desc}\n\n"
        "Both serve different purposes — together they help you build toward becoming "
        f"a {goal_label or 'professional'}."
    )


def _next_step(sg, profile, goal_label, db, user_id):
    path = _current_path(db, user_id)
    if not path:
        return (
            f"To help with that, I'll first need your goal and current skills. Once your "
            "profile is ready I can generate a roadmap. If you say 'Generate my roadmap', "
            "I'll do it right away."
        )
    current = None
    for n in path["nodes"]:
        if n["status"] in ("in_progress", "available", "locked"):
            current = n["title"]
            break
    if current:
        return f"Your next recommended step is: {current}. Focus on it to keep moving toward {goal_label or 'your goal'}."
    return f"You've covered your current steps — time to generate or continue your roadmap for {goal_label or 'your goal'}."


def _match_resource(topic, sg):
    t = topic.lower().strip()
    # exact / contains match on title or id
    for rid, r in sg.resources.items():
        if t == rid.lower() or rid in t or t in rid.lower():
            return r
    for rid, r in sg.resources.items():
        title = (r.get("title") or "").lower()
        if t == title or t in title or title in t:
            return r
    return None


def _match_skill(topic, sg):
    t = topic.lower().strip()
    for sid, s in sg.skills.items():
        if t == sid.lower() or t in sid.lower() or sid in t:
            return {**s, "id": sid}
        name = (s.get("name") or "").lower()
        if t == name or t in name:
            return {**s, "id": sid}
    return None


def _find_dependents(topic, sg):
    res = _match_resource(topic, sg)
    names = []
    if not res:
        return []
    for trick in res.get("skills", []):
        for rid, r in sg.resources.items():
            if trick in r.get("prerequisites", []):
                names.append(r.get("title", rid))
    for rid, r in sg.resources.items():
        if res.get("id") in r.get("prerequisites", []):
            names.append(r.get("title", rid))
    return list(dict.fromkeys(names))


def _name(sg, skill_id):
    s = sg.get_skill(skill_id)
    return (s or {}).get("name") or skill_id.replace("_", " ").title()


def _title_cap(s):
    return s.strip().title()


def _resource_on_path(db, user_id, resource_id):
    path = _current_path(db, user_id)
    return bool(path and any(n["resource_id"] == resource_id for n in path["nodes"]))


# ---------------------------------------------------------------------------
# Profile extraction + application
# ---------------------------------------------------------------------------
async def _extract_profile(msg, sg, data):
    all_skills = list(sg.skills.keys())
    all_goals = [g["name"] for g in sg.goals.values()]
    try:
        extracted = await extract_profile_from_message(msg, all_skills, all_goals)
        if extracted and _looks_like_profile(extracted, msg):
            return extracted
    except Exception:
        pass
    return _extract_profile_local(msg, sg)


def _looks_like_profile(extracted, msg):
    """Guard against a question being misread as profile skills (e.g. 'What is FastAPI?')."""
    low = msg.lower()
    if low.endswith("?") or re.match(r"^(what|how|why|can|which|when|is|are|do|does)\b", low):
        return False
    if not extracted:
        return False
    return bool(
        extracted.get("goal")
        or extracted.get("target_role")
        or extracted.get("weekly_hours")
        or extracted.get("preferred_learning_style")
        or extracted.get("skills")
    )


def _extract_profile_local(msg, sg):
    low = msg.lower()
    extracted = {}

    for kw, role in GOAL_KEYWORDS.items():
        if kw in low and role:
            extracted["target_role"] = role
            g = sg.goals.get(role, {})
            extracted["goal"] = g.get("name", role.replace("_", " ").title())
            break

    skills = {}
    for kw, sid in SKILL_KEYWORDS:
        if kw in low:
            skills[sid] = RULE_SKILL_CONF
    if skills:
        extracted["skills"] = skills

    hours = re.search(r"(\d+)\s*(?:hours?|hrs?)\s*(?:per week|a week|weekly|/week)?", low)
    if hours:
        extracted["weekly_hours"] = float(hours.group(1))

    if "project" in low:
        extracted["preferred_learning_style"] = "project"
    elif "video" in low:
        extracted["preferred_learning_style"] = "video"
    elif "read" in low or "text" in low or "book" in low:
        extracted["preferred_learning_style"] = "text"
    elif "mix" in low:
        extracted["preferred_learning_style"] = "mixed"

    if "beginner" in low:
        extracted["experience_level"] = "beginner"
    elif "intermediate" in low:
        extracted["experience_level"] = "intermediate"
    elif "advanced" in low:
        extracted["experience_level"] = "advanced"

    return extracted if (extracted.get("goal") or extracted.get("skills") or "weekly_hours" in extracted) else None


def _apply_extraction(db, user_id, extracted, profile, sg):
    applied = False
    if extracted.get("goal"):
        profile.goal = extracted["goal"]
        applied = True
    if extracted.get("target_role"):
        resolved = sg.resolve_goal_role(extracted["target_role"])
        profile.target_role = resolved or extracted["target_role"]
        applied = True
    if extracted.get("interests"):
        profile.interests = extracted["interests"]
    if extracted.get("experience_level"):
        profile.experience_level = extracted["experience_level"]
    if extracted.get("weekly_hours"):
        profile.weekly_hours = float(extracted["weekly_hours"])
        applied = True
    if extracted.get("preferred_learning_style"):
        profile.preferred_learning_style = extracted["preferred_learning_style"]
        applied = True
    for skill_id, conf in (extracted.get("skills") or {}).items():
        if skill_id in sg.skills:
            existing = db.query(UserSkill).filter(
                UserSkill.user_id == user_id, UserSkill.skill_id == skill_id
            ).first()
            conf = float(conf) if conf is not None else INFER_CONF
            if existing:
                existing.confidence = max(existing.confidence, conf)
            else:
                db.add(UserSkill(user_id=user_id, skill_id=skill_id, confidence=conf, source="inferred"))
            applied = True
    db.commit()
    return applied


# ---------------------------------------------------------------------------
# Modification handling
# ---------------------------------------------------------------------------
def _apply_modification(msg, db, user_id, sg):
    low = msg.lower()
    note = ""
    hours = re.search(r"(only|just|now|want|need|have|about)?\s*(\d+)\s*(?:hours?|hrs?)\s*(?:per week|a week|weekly|/week)?", low)
    if hours:
        profile = _get_or_create_profile(db, user_id)
        profile.weekly_hours = float(hours.group(2))
        db.commit()
        note = f"I've updated your availability to {float(hours.group(2))} hours/week and rebuilt your roadmap timeline."
    elif re.search(r"(shorter|simpler|easier|less time|reduce|remov(e|ing)? advanced)", low):
        note = "I've adjusted the path to focus on core skills first; advanced topics come later."
    else:
        note = "I've refreshed your roadmap based on your latest input."
    return note


# ---------------------------------------------------------------------------
# Roadmap generation
# ---------------------------------------------------------------------------
def _generate_and_reply(db, user_id, current, modified_note=None):
    try:
        result = generate_learning_path(db, user_id)
    except Exception:
        result = None
    if result and result.milestones:
        total = result.total_estimated_weeks
        hours = result.total_estimated_hours
        m_names = " → ".join(f'"{m.title}"' for m in result.milestones[:3])
        if total < 0:
            total = 0
        is_modification = modified_note is not None
        response_type = "path_update" if is_modification else "roadmap_generation"
        lead = modified_note or "Here's your personalized learning roadmap!"
        return ChatResponse(
            type=response_type,
            reply=(
                f"{lead}\n\nYour roadmap has {len(result.milestones)} milestones "
                f"({m_names}{'...' if len(result.milestones) > 3 else ''}). "
                f"Estimated: {hours}h over about {total} week{'s' if total != 1 else ''}. "
                "Open the Roadmap page to see it, or ask me about any step."
            ),
            extracted_profile=current,
            profile_complete=True,
        )
    return ChatResponse(
        type="chat",
        reply="I tried to generate your roadmap, but ran into a snag. Make sure your goal "
        "and current skills are set, then say 'Generate my roadmap' again.",
        extracted_profile=current,
        profile_complete=False,
    )


def _extract_reasons(reply: str) -> list[str]:
    """
    Extract bullet-point reasons from an explanation reply.
    Returns a list of reason strings, or the whole reply as one item.
    """
    lines = reply.splitlines()
    reasons = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(("- ", "• ", "* ", "· ")):
            reasons.append(stripped[2:].strip())
        elif stripped and stripped[0].isdigit() and len(stripped) > 2 and stripped[1] in ".):":
            reasons.append(stripped[2:].strip())
    if not reasons and reply.strip():
        # Return the whole reply as a single reason
        reasons = [reply.strip()]
    return reasons


# ---------------------------------------------------------------------------
# Follow-up / confirmation
# ---------------------------------------------------------------------------
def _ask_followup(missing):
    if "goal" in missing:
        return "What would you like to become? For example: a backend developer, data scientist, or frontend developer?"
    if "skills" in missing:
        return "What skills do you already have? (e.g. Python, SQL, JavaScript) — this helps me skip beginner topics you don't need."
    if "weekly_hours" in missing:
        return "How many hours per week can you dedicate to learning?"
    if "preferred_learning_style" in missing:
        return "Do you prefer learning through videos, reading, hands-on projects, or a mix?"
    return "Is there anything else you'd like to tell me about your learning preferences?"


def _confirm_profile(profile):
    goal = profile.get("goal") or (profile.get("target_role") or "").replace("_", " ").title() or "your goal"
    skills = ", ".join(profile.get("skills", {}).keys()) or "none yet"
    hours = profile.get("weekly_hours") or "?"
    style = profile.get("preferred_learning_style") or "mixed"
    return (
        f"Great — I've got everything I need.\n\n"
        f"• Goal: {goal}\n"
        f"• Current skills: {skills}\n"
        f"• Availability: {hours} hours/week\n"
        f"• Learning style: {style}\n\n"
        "Say 'Generate my roadmap' and I'll build your personalized learning path!"
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_or_create_user(db, user_id):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id)
        db.add(user)
        db.flush()
    return user


def _get_or_create_profile(db, user_id):
    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        profile = LearnerProfile(user_id=user_id)
        db.add(profile)
        db.flush()
    return profile


def _snapshot_profile(db, user_id):
    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    }
    return {
        "goal": profile.goal if profile else "",
        "target_role": profile.target_role if profile else "",
        "interests": (profile.interests or []) if profile else [],
        "experience_level": profile.experience_level if profile else "beginner",
        "weekly_hours": profile.weekly_hours if profile else None,
        "preferred_learning_style": profile.preferred_learning_style if profile else "",
        "skills": user_skills,
    }


def _find_missing_fields(profile, sg):
    missing = []
    if not profile.get("goal") and not profile.get("target_role"):
        missing.append("goal")
    if not profile.get("skills"):
        missing.append("skills")
    if not profile.get("weekly_hours"):
        missing.append("weekly_hours")
    if not profile.get("preferred_learning_style"):
        missing.append("preferred_learning_style")
    return missing


def _profile_has_baseline(profile):
    return bool(profile.get("goal") or profile.get("target_role"))


def _current_path(db, user_id):
    lp = db.query(LearningPath).filter(
        LearningPath.user_id == user_id, LearningPath.status == "active"
    ).first()
    if not lp:
        return None
    nodes = (
        db.query(PathNode)
        .filter(PathNode.path_id == lp.id)
        .order_by(PathNode.milestone_number, PathNode.order_in_milestone)
        .all()
    )
    return {
        "total_hours": lp.total_estimated_hours,
        "estimated_weeks": lp.total_estimated_weeks,
        "nodes": [
            {"resource_id": n.resource_id, "title": n.resource_title, "status": n.status}
            for n in nodes
        ],
    }

def _save_assistant_reply(db, user_id, reply):
    if reply:
        db.add(DBChatMessage(user_id=user_id, role="assistant", content=reply))
        db.commit()
