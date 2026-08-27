import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import useUserStore from '../store/useUserStore'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const SKILL_LABELS = {
  python_basics: 'Python',
  sql_basics: 'SQL',
  git_basics: 'Git',
  functions: 'Functions',
  oop: 'OOP',
  rest_apis: 'REST APIs',
  fastapi: 'FastAPI',
  postgresql: 'PostgreSQL',
  docker_basics: 'Docker',
  testing: 'Testing',
  authentication: 'Auth',
  http_basics: 'HTTP',
}

const STATUS_BAR_COLORS = {
  completed: '#10b981',
  in_progress: '#f59e0b',
  available: '#6366f1',
  locked: '#334155',
  skipped: '#6b7280',
  failed: '#ef4444',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { userId, profile } = useUserStore()
  const { logout } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      navigate('/onboarding')
      return
    }
    loadDashboard(userId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const loadDashboard = async (id) => {
    setLoading(true)
    try {
      const data = await api.getDashboard()
      setDashboard(data)
    } catch (e) {
      console.error('Dashboard load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-surface-400 mb-4">No data available</p>
          <button onClick={() => navigate('/roadmap')} className="px-6 py-2 rounded-xl bg-primary-600 text-white">
            Go to Roadmap
          </button>
        </div>
      </div>
    )
  }

  const radarData = Object.entries(dashboard.skills || {}).map(([id, conf]) => ({
    skill: SKILL_LABELS[id] || id.replace(/_/g, ' '),
    level: Math.round(conf * 100),
    fullMark: 100,
  })).slice(0, 8)

  const barData = Object.entries(dashboard.skills || {}).map(([id, conf]) => ({
    name: SKILL_LABELS[id] || id.substring(0, 8),
    value: Math.round(conf * 100),
  })).slice(0, 10)

  return (
    <div className="min-h-screen bg-surface-950">
      <header className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-surface-400 hover:text-white transition-colors">
            ← Pathfinder
          </button>
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <button
            onClick={() => navigate('/roadmap')}
            className="px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm transition-colors"
          >
            Roadmap
          </button>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Overall Progress', value: `${Math.round(dashboard.overall_progress * 100)}%`, color: 'text-primary-400' },
            { label: 'Current Milestone', value: dashboard.current_milestone, color: 'text-amber-400' },
            { label: 'Milestones Done', value: `${dashboard.milestones_completed}/${dashboard.total_milestones}`, color: 'text-emerald-400' },
            { label: 'Est. Completion', value: dashboard.estimated_completion || 'N/A', color: 'text-purple-400' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-900 rounded-2xl p-5 border border-surface-800"
            >
              <p className="text-xs text-surface-400 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {dashboard.next_action && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-primary-600/10 to-purple-600/10 rounded-2xl p-6 border border-primary-500/20"
          >
            <p className="text-xs text-primary-400 font-medium mb-2">📌 NEXT ACTION</p>
            <h3 className="text-xl font-bold text-white">{dashboard.next_action.title}</h3>
            <p className="text-sm text-surface-400 mt-1">{dashboard.next_action.reason}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-900 rounded-2xl p-6 border border-surface-800"
          >
            <h3 className="text-sm font-semibold text-surface-300 mb-4">Skill Radar</h3>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Radar name="Skills" dataKey="level" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-surface-500 text-sm text-center py-8">No skills data yet</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface-900 rounded-2xl p-6 border border-surface-800"
          >
            <h3 className="text-sm font-semibold text-surface-300 mb-4">Skill Levels</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                    itemStyle={{ color: '#a5b4fc' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.value >= 70 ? '#10b981' : entry.value >= 40 ? '#f59e0b' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-surface-500 text-sm text-center py-8">No skills data yet</p>
            )}
          </motion.div>
        </div>

        {dashboard.recent_adaptations?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface-900 rounded-2xl p-6 border border-surface-800"
          >
            <h3 className="text-sm font-semibold text-surface-300 mb-4">Recent Adaptations</h3>
            <div className="space-y-3">
              {dashboard.recent_adaptations.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface-800/50">
                  <span className="text-lg">
                    {a.trigger === 'course_completed' ? '✅' :
                     a.trigger === 'assessment_failed' ? '❌' :
                     a.trigger === 'course_skipped' ? '⏭️' : '🔄'}
                  </span>
                  <div>
                    <p className="text-sm text-surface-200">{a.explanation}</p>
                    <p className="text-xs text-surface-500 mt-1">{a.created_at?.split('T')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
