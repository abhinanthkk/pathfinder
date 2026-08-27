import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import RoadmapPage from './pages/RoadmapPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'

function App() {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 font-sans">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </div>
  )
}

export default App
