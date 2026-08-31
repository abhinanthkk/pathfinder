import { Suspense, lazy, useEffect, useRef } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Spinner } from './components/ui/Spinner'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { pageShell } from './lib/motion'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NotFoundPage from './pages/NotFoundPage'

const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background transition-colors duration-300">
      <Spinner label="Loading…" />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence>
      <motion.div
        key={location.pathname}
        initial={pageShell.initial}
        animate={pageShell.enter}
        exit={pageShell.exit}
      >
        <Routes location={location}>
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
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingScreen />}>
                  <ProgressPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingScreen />}>
                  <ProfilePage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <ScrollToTop />
      <AnimatedRoutes />
    </div>
  )
}

export default App
