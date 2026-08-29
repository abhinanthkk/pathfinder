import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'
import { getOnboardingStatus } from '../services/api'

function useOnboardingGate() {
  const [status, setStatus] = useState(null)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await getOnboardingStatus()
        if (active) {
          setStatus(data)
          setChecked(true)
        }
      } catch {
        // If the status call fails (e.g. network), allow access rather than
        // blocking the user; individual pages handle their own errors.
        if (active) {
          setError(true)
          setChecked(true)
        }
      }
    })()
    return () => { active = false }
  }, [])

  return { status, checked, error }
}

ProtectedRoute.propTypes = {
  children: PropTypes.node,
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { status, checked, error } = useOnboardingGate()

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

  if (!checked) {
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
