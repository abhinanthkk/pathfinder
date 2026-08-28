import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import PropTypes from 'prop-types'
import { LayoutDashboard, Map, ArrowRight, Sparkles } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { skillLabel } from '../utils/labels'
import api from '../services/api'

StatCard.propTypes = {
  label: PropTypes.string,
  value: PropTypes.node,
  color: PropTypes.string,
}

function StatCard({ label, value, color = 'text-surface-100' }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-wide text-surface-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </Card>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getDashboard()
      setDashboard(data)
    } catch {
      setError('We couldn’t load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const radarData = Object.entries(dashboard?.skills || {})
    .map(([id, conf]) => ({
      skill: skillLabel(id).slice(0, 12),
      level: Math.round((conf || 0) * 100),
      fullMark: 100,
    }))
    .slice(0, 8)

  const barData = Object.entries(dashboard?.skills || {})
    .map(([id, conf]) => ({
      name: skillLabel(id),
      value: Math.round((conf || 0) * 100),
    }))
    .slice(0, 10)

  const hasSkills = Object.keys(dashboard?.skills || {}).length > 0
  const hasAdaptations = (dashboard?.recent_adaptations || []).length > 0

  return (
    <AppShell>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Your learning progress at a glance."
        actions={
          <Button onClick={() => navigate('/roadmap')}>
            <Map className="h-4 w-4" aria-hidden="true" />
            View roadmap
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        {loading && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-28" />
            ))}
          </div>
        )}

        {error && <ErrorState title="Couldn’t load dashboard" description={error} onRetry={loadDashboard} />}

        {!loading && !error && dashboard && (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Overall progress"
                value={`${Math.round((dashboard.overall_progress || 0) * 100)}%`}
                color="text-primary-400"
              />
              <StatCard
                label="Current milestone"
                value={dashboard.current_milestone || '—'}
                color="text-amber-400"
              />
              <StatCard
                label="Milestones done"
                value={
                  dashboard.total_milestones
                    ? `${dashboard.milestones_completed}/${dashboard.total_milestones}`
                    : '—'
                }
                color="text-emerald-400"
              />
              <StatCard
                label="Est. completion"
                value={dashboard.estimated_completion || '—'}
                color="text-purple-400"
              />
            </div>

            {/* Next action */}
            {dashboard.next_action ? (
              <Card
                className="border-primary-500/30 bg-gradient-to-r from-primary-600/10 to-purple-600/10"
              >
                <p className="flex items-center gap-2 text-xs font-medium text-primary-400">
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Next action
                </p>
                <h3 className="mt-2 text-lg font-bold text-white">{dashboard.next_action.title}</h3>
                <p className="mt-1 text-sm text-surface-400">{dashboard.next_action.reason}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/roadmap')}
                >
                  Go to roadmap <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Card>
            ) : (
              <EmptyState
                icon={Map}
                title="No tasks in progress"
                description="Generate your learning path to see your next recommended step."
                action={
                  <Button onClick={() => navigate('/onboarding')}>Set up your profile</Button>
                }
              />
            )}

            {/* Skills charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <h3 className="mb-4 text-sm font-semibold text-surface-300">Skill radar</h3>
                {hasSkills ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#1e293b" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                        />
                        <Radar
                          name="Skills"
                          dataKey="level"
                          stroke="#6366f1"
                          fill="#6366f1"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="No skills yet" description="Your skill levels will appear here once you set up your profile." />
                )}
              </Card>

              <Card>
                <h3 className="mb-4 text-sm font-semibold text-surface-300">Skill levels</h3>
                {hasSkills ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          width={90}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: '#e2e8f0' }}
                          itemStyle={{ color: '#a5b4fc' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {barData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={
                                entry.value >= 70 ? '#10b981' : entry.value >= 40 ? '#f59e0b' : '#6366f1'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState title="No skills yet" description="Your skill levels will appear here once you set up your profile." />
                )}
              </Card>
            </div>

            {/* Recent adaptations */}
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-surface-300">Recent updates</h3>
              {hasAdaptations ? (
                <ul className="space-y-3">
                  {dashboard.recent_adaptations.map((a, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-surface-800/50 p-3"
                    >
                      <span className="text-lg" aria-hidden="true">
                        {a.trigger === 'course_completed' ? '✅'
                          : a.trigger === 'assessment_failed' ? '❌'
                            : a.trigger === 'course_skipped' ? '⏭️'
                              : '🔄'}
                      </span>
                      <div>
                        <p className="text-sm text-surface-200">{a.explanation}</p>
                        <p className="mt-1 text-xs text-surface-500">
                          {a.created_at?.split('T')[0] || ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No updates yet"
                  description="Progress on your roadmap will appear here as you complete steps."
                />
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}
