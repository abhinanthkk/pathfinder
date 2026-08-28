# Pathfinder — Requirements

> AI-powered, personalized learning-path (directed graph) recommender.

## 1. Overview

Pathfinder generates a personalized, topologically ordered learning roadmap from a
learner's career goal, existing skills, and weekly commitment. It tracks completion,
partially re-sequences future milestones when progress or failures change, and provides
an in-app AI assistant. The product targets a calm, refined, enterprise feel driven by
deep dark surfaces, thin borders, a yellow accent, and technical metadata — not a
tech/demo aesthetic.

## 2. Functional requirements

### 2.1 Authentication & accounts
- **FR-01** Sign up with `name`, `email`, `password` → returns a JWT (`POST /api/auth/signup`).
- **FR-02** Log in with `email`, `password` → returns a JWT (`POST /api/auth/login`).
- **FR-03** Session is validated on load via `/api/auth/me`; the JWT is stored in
  `localStorage["token"]` and sent as a Bearer token on API requests.
- **FR-04** Passwords are hashed with `bcrypt` (via `get_password_hash` / `verify_password`).
- **FR-05** Unauthenticated access to protected routes redirects to `/login`.

### 2.2 Onboarding (profile parameters)
- **FR-06** The **manual profile form is the primary onboarding experience** — target role,
  existing baseline skills, weekly commitment, preferred learning style, and experience level.
- **FR-07** A bottom-right **Pathfinder AI assistant** helps users complete the form without
  being a separate onboarding mode (i.e. no "Switch to AI" flow).
- **FR-08** Form validation requires a target role before submission.
- **FR-09** Submission persists the profile (`POST /api/profile`) and navigates to the roadmap.

### 2.3 Learning path (roadmap)
- **FR-10** Generate a personalized path (`POST /api/path`) of milestones and resources with
  estimated hours and prerequisites (`GET /api/path`).
- **FR-11** Render the path as a directed graph: goal → milestones → skills → topics → resources.
- **FR-12** Milestones expose status transitions: `available`, `in_progress`, `completed`,
  `failed`, `skipped` (`POST /api/progress`).
- **FR-13** A progress summary reports current milestone (by title), total estimated hours,
  completed/total steps, progress %, and an estimated completion date.

### 2.4 Dashboard
- **FR-14** `/api/dashboard` returns overall progress, current milestone, milestones completed,
  estimated completion, recommended next action, skill levels, and recent adaptations.
- **FR-15** The dashboard presents an overall-progress hero, a skill overview, and recent
  adaptive events.

### 2.5 AI assistant
- **FR-16** A persistent in-app advisor answers learning/roadmap questions.
- **FR-17** The onboarding assistant is context-aware (knows the field the user is viewing)
  and never replaces the form (`POST /api/ask`).

## 3. Non-functional requirements

### 3.1 Quality & reliability
- **NFR-01** No fake or placeholder data — API responses drive the UI; empty/error states are real.
- **NFR-02** Existing API contracts are preserved across UI changes.

### 3.2 Accessibility & usability
- **NFR-03** Keyboard-operable dialogs/drawers with focus management, `Esc` to close, and
  `role="dialog"` / `aria-modal` semantics.
- **NFR-04** Form controls are labeled; decorative icons are `aria-hidden`; helpers do not
  duplicate screen-reader announcements.

### 3.3 Performance & robustness
- **NFR-05** Production build (`vite build`) and lint (`eslint`) pass with no errors.
- **NFR-06** Fonts load without errors; the UI is typographically unified on Inter, with
  JetBrains Mono reserved for technical metadata.

### 3.4 Security
- **NFR-07** Secrets live in environment variables (`.env`), never in the repository; the
  real `.env` is gitignored.
- **NFR-08** Passwords are hashed (bcrypt); API routes require a valid JWT.
