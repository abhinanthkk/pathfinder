from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.models.init_db import init_db
from app.api import profile as profile_api
from app.api import recommendation as recommendation_api
from app.api import path as path_api
from app.api import chat as chat_api
from app.api import explain as explain_api
from app.api import progress as progress_api
from app.api import dashboard as dashboard_api
from app.api import qa as qa_api
from app.api import auth as auth_api
from app.api import streak as streak_api
from app.api import badges as badges_api
from app.api import skill_progress as skill_progress_api
from app.api import roadmap_generate as roadmap_generate_api
from app.api import goals as goals_api

app = FastAPI(
    title="Pathfinder API",
    description="AI-Powered Personalized Learning Path Recommender",
    version="0.2.0",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing routers
app.include_router(profile_api.router, prefix="/api")
app.include_router(recommendation_api.router, prefix="/api")
app.include_router(path_api.router, prefix="/api")
app.include_router(chat_api.router, prefix="/api")
app.include_router(explain_api.router, prefix="/api")
app.include_router(progress_api.router, prefix="/api")
app.include_router(dashboard_api.router, prefix="/api")
app.include_router(qa_api.router, prefix="/api")
app.include_router(auth_api.router, prefix="/api")

# New routers
app.include_router(streak_api.router, prefix="/api")
app.include_router(badges_api.router, prefix="/api")
app.include_router(skill_progress_api.router, prefix="/api")
app.include_router(roadmap_generate_api.router, prefix="/api")
app.include_router(goals_api.router, prefix="/api")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Pathfinder API is running"}
