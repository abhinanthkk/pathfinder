/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useUser, useAuth as useClerkAuth } from '@clerk/react'
import { getMe, login as apiLogin, signup as apiSignup, setClerkToken } from '../services/api'
import useUserStore from '../store/useUserStore'

const AuthContext = createContext(null)

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)

const mapClerkUser = (clerkUser) => {
  if (!clerkUser) return null
  const email = clerkUser.primaryEmailAddress?.emailAddress || ''
  const name =
    clerkUser.fullName ||
    clerkUser.username ||
    email ||
    'User'
  return { id: clerkUser.id, name, email }
}

const LegacyAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const userData = await getMe()
          setUser(userData)
          useUserStore.getState().setUserId(userData.id)
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          useUserStore.getState().setUserId(null)
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await apiLogin({ email, password })
    localStorage.setItem('token', res.access_token)
    localStorage.removeItem('user')
    const userData = await getMe()
    setUser(userData)
    useUserStore.getState().setUserId(userData.id)
    return userData
  }, [])

  const signup = useCallback(async (name, email, password) => {
    const res = await apiSignup({ name, email, password })
    localStorage.setItem('token', res.access_token)
    localStorage.removeItem('user')
    const userData = await getMe()
    setUser(userData)
    useUserStore.getState().setUserId(userData.id)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    useUserStore.getState().setUserId(null)
    useUserStore.getState().setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

LegacyAuthProvider.propTypes = {
  children: PropTypes.node,
}

const ClerkAuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const { signOut, getToken } = useClerkAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      if (!isLoaded) return
      if (!isSignedIn) {
        if (!cancelled) {
          setClerkToken(null)
          setUser(null)
          useUserStore.getState().setUserId(null)
          setLoading(false)
        }
        return
      }
      try {
        const token = await getToken()
        if (cancelled) return
        setClerkToken(token)
        const userData = await getMe()
        if (cancelled) return
        setUser(userData)
        useUserStore.getState().setUserId(userData.id)
      } catch {
        // Backend unavailable: expose the Clerk identity so the UI never blank-screens.
        if (cancelled) return
        setUser(mapClerkUser(clerkUser))
        useUserStore.getState().setUserId(clerkUser?.id || null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    sync()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, clerkUser, getToken])

  const logout = useCallback(() => {
    setClerkToken(null)
    setUser(null)
    useUserStore.getState().setUserId(null)
    useUserStore.getState().setProfile(null)
    signOut().catch(() => {})
  }, [signOut])

  return (
    <AuthContext.Provider value={{ user, loading, login: null, signup: null, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

ClerkAuthProvider.propTypes = {
  children: PropTypes.node,
}

export const AuthProvider = ({ children }) =>
  clerkEnabled ? (
    <ClerkAuthProvider>{children}</ClerkAuthProvider>
  ) : (
    <LegacyAuthProvider>{children}</LegacyAuthProvider>
  )

AuthProvider.propTypes = {
  children: PropTypes.node,
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
