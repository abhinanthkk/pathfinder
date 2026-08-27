from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import User, LearnerProfile, UserSkill
from app.schemas.profile import ProfileCreate, ProfileResponse
from app.services.skill_graph import get_skill_graph
from app.core.auth import get_current_user

router = APIRouter(tags=["profile"])


@router.post("/profile", response_model=ProfileResponse)
def create_or_update_profile(data: ProfileCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sg = get_skill_graph()
    user_id = current_user.id

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id)
        db.add(user)
        db.flush()

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        profile = LearnerProfile(user_id=user_id)
        db.add(profile)
        db.flush()

    profile.goal = data.goal
    profile.target_role = data.target_role
    profile.interests = data.interests
    profile.experience_level = data.experience_level
    profile.weekly_hours = data.weekly_hours
    profile.preferred_learning_style = data.preferred_learning_style
    profile.onboarding_complete = True

    for skill_id, confidence in data.skills.items():
        user_skill = db.query(UserSkill).filter(
            UserSkill.user_id == user_id,
            UserSkill.skill_id == skill_id,
        ).first()
        if user_skill:
            user_skill.confidence = confidence
            user_skill.source = "self_reported"
        else:
            user_skill = UserSkill(
                user_id=user_id,
                skill_id=skill_id,
                confidence=confidence,
                source="self_reported",
            )
            db.add(user_skill)

    db.commit()
    db.refresh(profile)

    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    }

    goal_skills = sg.get_goal_skills(data.target_role)
    skill_gaps = {
        skill: max(0.0, required - user_skills.get(skill, 0.0))
        for skill, required in goal_skills.items()
        if user_skills.get(skill, 0.0) < required
    }

    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        goal=profile.goal,
        target_role=profile.target_role,
        interests=profile.interests or [],
        experience_level=profile.experience_level,
        weekly_hours=profile.weekly_hours,
        preferred_learning_style=profile.preferred_learning_style,
        onboarding_complete=profile.onboarding_complete,
        skill_gaps=skill_gaps,
        user_skills=user_skills,
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sg = get_skill_graph()
    user_id = current_user.id

    profile = db.query(LearnerProfile).filter(LearnerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    user_skills = {
        s.skill_id: s.confidence
        for s in db.query(UserSkill).filter(UserSkill.user_id == user_id).all()
    }

    goal_skills = sg.get_goal_skills(profile.target_role)
    skill_gaps = {
        skill: max(0.0, required - user_skills.get(skill, 0.0))
        for skill, required in goal_skills.items()
        if user_skills.get(skill, 0.0) < required
    }

    return ProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        goal=profile.goal,
        target_role=profile.target_role,
        interests=profile.interests or [],
        experience_level=profile.experience_level,
        weekly_hours=profile.weekly_hours,
        preferred_learning_style=profile.preferred_learning_style,
        onboarding_complete=profile.onboarding_complete,
        skill_gaps=skill_gaps,
        user_skills=user_skills,
    )


@router.post("/seed-demo")
def seed_demo():
    from app.seed.demo import run_seed
    run_seed()
    return {"status": "ok", "user_id": "demo-user-001"}
