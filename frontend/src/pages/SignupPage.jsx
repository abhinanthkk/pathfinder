import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { UserPlus } from 'lucide-react'

const SignupPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      setLoading(true)
      await signup(name, email, password)
      navigate('/onboarding')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create an account')
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
            <UserPlus className="w-6 h-6 text-primary-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Create Account</h2>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/20 text-red-300 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Name</label>
            <input 
              type="text" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-950 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary-500"
            />
          </div>
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
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        <div className="mt-6 text-center text-surface-400">
          Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300">Log In</Link>
        </div>
      </motion.div>
    </div>
  )
}

export default SignupPage
