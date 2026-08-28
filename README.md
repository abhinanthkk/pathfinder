# AI-Powered Personalized Learning Path Recommender

AI-Powered Personalized Learning Path Recommender is an intelligent learning assistant that generates adaptive, personalized learning roadmaps based on learner goals, skills, progress, and preferences.

## Key Features

- **Conversational AI Onboarding**: Interactively determine user goals and starting points.
- **Learner Profiling**: Build a comprehensive profile of the user's current knowledge and aspirations.
- **Personalized Recommendations**: Get customized learning materials and steps tailored to the user.
- **Dynamic Learning Roadmap**: Generate and visualize the learning path.
- **Milestones and Prerequisites**: Clear tracking of what needs to be learned and when.
- **AI Recommendation Explanations**: Understand exactly *why* a specific topic or resource was recommended.
- **Progress Tracking**: Keep track of completed milestones.
- **Adaptive Roadmap Updates**: The learning path adjusts based on user progress and feedback.

## Technology Stack

**Frontend:**
- React
- Vite
- Tailwind CSS
- React Flow

**Backend:**
- FastAPI
- Python

**AI:**
- Nemotron Lightning API

**Data:**
- SQLite (or existing database implementation)

## Installation Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows use `.venv\Scripts\activate`
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables (create a `.env` file based on `.env.example` if available, or use the following):
   ```env
   # .env example
   NEMOTRON_API_KEY=your_api_key_here
   DATABASE_URL=sqlite:///./pathfinder.db
   ```
5. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (create a `.env.local` file):
   ```env
   # .env.local example
   VITE_API_BASE_URL=http://localhost:8000
   ```
4. Run the frontend development server:
   ```bash
   npm run dev
   ```

## How to Run the Project

1. Start both the backend and frontend servers as described above.
2. Open your browser and navigate to the frontend URL (typically `http://localhost:5173`).
