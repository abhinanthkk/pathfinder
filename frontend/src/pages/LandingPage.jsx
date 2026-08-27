import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useUserStore from '../store/useUserStore'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl"
      >
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
          AI-Powered Learning
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary-400 via-primary-300 to-purple-400 bg-clip-text text-transparent">
          Pathfinder
        </h1>

        <p className="text-xl text-surface-400 mb-10 leading-relaxed">
          Your personalized, AI-powered learning roadmap. Tell us your goal, and we'll chart the path from where you are to where you want to be.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/40"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 font-semibold transition-all duration-200 border border-surface-700"
          >
            Log In
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-20 grid grid-cols-3 gap-8 text-center"
      >
        {[
          { label: 'Smart Profiling', desc: 'AI understands your skills' },
          { label: 'Adaptive Paths', desc: 'Replans when you fall behind' },
          { label: 'Clear Progress', desc: 'Always know what to do next' },
        ].map((item) => (
          <div key={item.label} className="p-4">
            <h3 className="text-sm font-semibold text-surface-200 mb-1">{item.label}</h3>
            <p className="text-xs text-surface-500">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
