import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer,
} from 'recharts'
import { LayoutDashboard, Map, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Button } from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { skillLabel } from '../utils/labels'
import api from '../services/api'
import useUserStore from '../store/useUserStore'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { profile } = useUserStore()
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
      setError('Unable to load workspace metrics. Please check connection and retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const radarData = Object.entries(dashboard?.skills || {})
    .map(([id, conf]) => ({
      skill: skillLabel(id).slice(0, 14),
      level: Math.round((conf || 0) * 100),
      fullMark: 100,
    }))
    .slice(0, 8)

  const hasSkills = Object.keys(dashboard?.skills || {}).length > 0
  const hasAdaptations = (dashboard?.recent_adaptations || []).length > 0

  const goalName =
    profile?.goal ||
    (profile?.target_role ? profile.target_role.replace(/_/g, ' ').toUpperCase() : 'YOUR LEARNING PATH')

  const progressPercent = Math.round((dashboard?.overall_progress || 0) * 100)

  return (
    <AppShell>
      <PageHeader
        tag="PATHFINDER / OVERVIEW"
        icon={LayoutDashboard}
        title="WORKSPACE OVERVIEW"
        description="Unified telemetry across your active learning graph, milestones, and skill acquisitions."
        actions={
          <Button onClick={() => navigate('/roadmap')} className="font-mono text-xs">
            <Map className="h-3.5 w-3.5" aria-hidden="true" />
            OPEN ROADMAP
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} className="h-28" />
            ))}
          </div>
        )}

        {error && <ErrorState title="Telemetry Unavailable" description={error} onRetry={loadDashboard} />}

        {!loading && !error && dashboard && (
          <>
            {/* Primary Workspace Overview Banner */}
            <div className="overflow-hidden rounded-[8px] border border-surface-700 bg-surface-900/60 p-6 sm:p-8 shadow-panel">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary-400">
                      &gt; YOUR LEARNING PATH
                    </span>
                    <span className="rounded-[3px] border border-surface-700 bg-surface-850 px-1.5 py-0.2 font-mono text-[10px] text-surface-400">
                      ACTIVE
                    </span>
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    {goalName}
                  </h2>

                  {/* Progress Metric Bar */}
                  <div className="mt-6">
                    <div className="flex items-baseline justify-between font-mono text-xs mb-2">
                      <span className="text-surface-400 uppercase tracking-wider">&gt; OVERALL COMPLETION</span>
                      <span className="text-primary-400 font-bold text-sm">{progressPercent}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-[4px] bg-surface-950 border border-surface-800">
                      <div
                        className="h-full rounded-[3px] bg-primary-400 transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-surface-500">
                      <span>
                        {dashboard.milestones_completed || 0} / {dashboard.total_milestones || 0} MILESTONES COMPLETED
                      </span>
                      <span>VELOCITY: NOMINAL</span>
                    </div>
                  </div>

                  {/* Key Metrics Grid with Thin Dividers */}
                  <div className="mt-7 grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-surface-800 bg-surface-800 sm:grid-cols-2">
                    <div className="bg-surface-950/80 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-surface-500">
                        &gt; CURRENT MILESTONE
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white truncate">
                        {dashboard.current_milestone || 'INITIALIZING'}
                      </p>
                    </div>
                    <div className="bg-surface-950/80 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-surface-500">
                        &gt; ESTIMATED COMPLETION
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-surface-200">
                        {dashboard.estimated_completion || 'CALCULATING…'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Action Direct Action Panel */}
                <div className="w-full lg:max-w-md lg:border-l lg:border-surface-800 lg:pl-8 flex flex-col justify-between">
                  {dashboard.next_action ? (
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-primary-400">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>RECOMMENDED NEXT ACTION</span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold leading-snug text-white">
                        {dashboard.next_action.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-surface-400">
                        {dashboard.next_action.reason}
                      </p>
                      <div className="mt-6 flex items-center gap-3">
                        <Button
                          size="md"
                          onClick={() => navigate('/roadmap')}
                          className="font-mono text-xs tracking-wider"
                        >
                          CONTINUE STEP
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={() => navigate('/roadmap')}
                          className="font-mono text-xs"
                        >
                          VIEW IN GRAPH
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <EmptyState
                        icon={Map}
                        title="Roadmap Initialization Required"
                        description="Complete profile calibration to generate your structured roadmap."
                        action={
                          <Button onClick={() => navigate('/onboarding')} className="font-mono text-xs">
                            CALIBRATE PROFILE
                          </Button>
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Supporting Sections: Skills & Recent Activity */}
            <div id="progress" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Skill Matrix */}
              <div className="rounded-[8px] border border-surface-800 bg-surface-900/50 p-6">
                <div className="flex items-center justify-between border-b border-surface-800 pb-3">
                  <div>
                    <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
                      &gt; TELEMETRY / SKILLS
                    </p>
                    <h3 className="mt-0.5 text-base font-semibold text-white uppercase tracking-tight">
                      SKILL MATRIX
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-surface-500">CONFIDENCE GRAPH</span>
                </div>

                {hasSkills ? (
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#27272a" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                        />
                        <Radar
                          name="Confidence"
                          dataKey="level"
                          stroke="#FACC15"
                          fill="#FACC15"
                          fillOpacity={0.15}
                          strokeWidth={1.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-8">
                    <EmptyState
                      title="No skill points registered"
                      description="Skill confidence levels will populate as you complete modules and tests."
                    />
                  </div>
                )}
              </div>

              {/* Recent Activity & Adaptive Events */}
              <div className="rounded-[8px] border border-surface-800 bg-surface-900/50 p-6">
                <div className="flex items-center justify-between border-b border-surface-800 pb-3">
                  <div>
                    <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
                      &gt; AUDIT LOG / ADAPTATIONS
                    </p>
                    <h3 className="mt-0.5 text-base font-semibold text-white uppercase tracking-tight">
                      RECENT PROGRESS
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-surface-500">EVENT FEED</span>
                </div>

                {hasAdaptations ? (
                  <ul className="mt-4 space-y-2.5">
                    {dashboard.recent_adaptations.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-[6px] border border-surface-800 bg-surface-950/70 p-3"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border border-primary-400/30 bg-primary-400/10 text-primary-400">
                          <CheckCircle2 className="h-3 w-3" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-surface-200 leading-relaxed">{a.explanation}</p>
                          <p className="mt-1 font-mono text-[10px] text-surface-500">
                            {a.created_at?.split('T')[0] || 'Recently'} · Trigger: {a.trigger?.replace('_', ' ').toUpperCase()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-8">
                    <EmptyState
                      icon={Sparkles}
                      title="No recent adaptations recorded"
                      description="Events will record automatically when milestones change status or tests are logged."
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

