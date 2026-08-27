from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.schemas.profile import RecommendationRequest, RecommendationResponse
from app.services.recommendation_engine import get_recommendations
from app.core.auth import get_current_user
from app.models.models import User

router = APIRouter(tags=["recommendation"])


@router.post("/recommend", response_model=RecommendationResponse)
def recommend(data: RecommendationRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_recommendations(db, current_user.id, data.limit)
