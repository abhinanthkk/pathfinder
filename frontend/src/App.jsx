import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Spinner } from './components/ui/Spinner'
import { ProtectedRoute } from './routes/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NotFoundPage from './pages/NotFoundPage'

// Lazy-load heavy authenticated screens to keep the initial bundle lean.
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950">
      <Spinner label="Loading…" />
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 font-sans">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <OnboardingPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <RoadmapPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingScreen />}>
                <DashboardPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App
