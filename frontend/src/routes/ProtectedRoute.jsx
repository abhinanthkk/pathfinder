import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'
import { getOnboardingStatus } from '../services/api'

function useOnboardingGate() {
  const location = useLocation()
  const [status, setStatus] = useState(null)
  // The pathname that the current `status` was fetched for. This lets us
  // distinguish "still loading data for the current route" from "confirmed
  // the user needs onboarding". Without it, a stale `needs_onboarding` result
  // fetched while the user was on /onboarding would still be observed on the
  // very first render of /dashboard (before the refetch effect has run) and
  // wrongly bounce the user straight back to the "Add another learning path"
  // form after a successful first roadmap generation.
  const [checkedPath, setCheckedPath] = useState(null)
  const [error, setError] = useState(false)

  // Re-check onboarding status whenever the route changes. ProtectedRoute is
  // the same component for every authenticated route, so it is NOT remounted
  // when navigating between them (e.g. onboarding -> dashboard). We therefore
  // refetch on pathname change, but never treat a result as valid until it was
  // fetched for the CURRENT pathname.
  useEffect(() => {
    let active = true
    // Invalidate any previously-fetched status for the new route so the guard
    // shows a loading state instead of acting on stale data mid-transition.
    setCheckedPath(null)
    setError(false)
    ;(async () => {
      try {
        const data = await getOnboardingStatus()
        if (active) {
          setStatus(data)
          setCheckedPath(location.pathname)
        }
      } catch {
        // If the status call fails (e.g. network), allow access rather than
        // blocking the user; individual pages handle their own errors.
        if (active) {
          setError(true)
          setCheckedPath(location.pathname)
        }
      }
    })()
    return () => { active = false }
  }, [location.pathname])

  return { status, error, statusIsCurrent: checkedPath === location.pathname }
}

ProtectedRoute.propTypes = {
  children: PropTypes.node,
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { status, error, statusIsCurrent } = useOnboardingGate()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking your session…" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Data for the current route hasn't finished loading yet. Show a loading
  // state rather than acting on a status that may have been fetched for a
  // different route (e.g. still `needs_onboarding: true` from /onboarding
  // while transitioning to /dashboard after a successful roadmap generation).
  // This prevents an erroneous bounce back into the onboarding form.
  if (!statusIsCurrent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading your learning profile…" />
      </div>
    )
  }

  // First-login / no-goal redirect: send the user to onboarding unless they're
  // already there.
  if (
    !error &&
    status?.needs_onboarding &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
