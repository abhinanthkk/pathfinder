import React, { createContext, useContext, useState, useEffect } from 'react'
import { getMe, login as apiLogin, signup as apiSignup } from '../services/api'
import useUserStore from '../store/useUserStore'

const AuthContext = createContext(null)

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
        } catch (err) {
          localStorage.removeItem('token')
          useUserStore.getState().setUserId(null)
          useUserStore.getState().setProfile(null)
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email, password) => {
    const res = await apiLogin({ email, password })
    localStorage.setItem('token', res.access_token)
    const userData = await getMe()
    setUser(userData)
    useUserStore.getState().setUserId(userData.id)
  }

  const signup = async (name, email, password) => {
    const res = await apiSignup({ name, email, password })
    localStorage.setItem('token', res.access_token)
    const userData = await getMe()
    setUser(userData)
    useUserStore.getState().setUserId(userData.id)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    useUserStore.getState().setUserId(null)
    useUserStore.getState().setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
