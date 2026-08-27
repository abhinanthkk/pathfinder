import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { LogIn } from 'lucide-react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      setLoading(true)
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface-900 p-8 rounded-2xl border border-white/10 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary-500/20 rounded-xl">
            <LogIn className="w-6 h-6 text-primary-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-950 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-950 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary-500"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium p-3 rounded-lg mt-4 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <div className="mt-6 text-center text-surface-400">
          Don't have an account? <Link to="/signup" className="text-primary-400 hover:text-primary-300">Sign Up</Link>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage
