/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { getMe, login as apiLogin, signup as apiSignup } from '../services/api'
import useUserStore from '../store/useUserStore'

const AuthContext = createContext(null)

AuthProvider.propTypes = {
  children: PropTypes.node,
}

export const AuthProvider = ({ children }) => {
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
          // Invalid or expired token: clear local session
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
