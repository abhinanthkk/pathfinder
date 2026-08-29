import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import {
  LayoutDashboard, Map, ArrowRight, Sparkles, CheckCircle2,
  Flame, Trophy, TrendingUp, BookOpen, Target, Award,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Button } from '../components/ui/Button'
import { SkeletonCard } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { RoadmapSwitcher } from '../components/roles/RoadmapSwitcher'
import api from '../services/api'
import useGoalsStore from '../store/useGoalsStore'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function StreakWidget({ streak }) {
  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0
  const weekly = streak?.weekly_activity || []
  const slots = DAY_LABELS.map((day, i) => ({ day, active: weekly[i]?.active ?? false }))

  return (    <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" role="img" aria-label="fire">🔥</span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-surface-500">&gt; STREAK</p>
            <p className="text-2xl font-bold text-white">
              {current} <span className="font-mono text-sm font-normal text-primary-400">day{current !== 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-surface-500">LONGEST</p>
          <p className="font-mono text-base font-bold text-surface-200">{longest} days</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-1">
        {slots.map(({ day, active }) => (
          <div key={day} className="flex flex-col items-center gap-1.5">
            <div
              className={`h-7 w-7 rounded-[4px] border transition-all ${
                active ? 'border-primary-400/60 bg-primary-400/20' : 'border-surface-800 bg-surface-900'
              }`}
              title={day}
            >
              {active && (
                <div className="flex h-full items-center justify-center">
                  <Flame className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                </div>
              )}
            </div>
            <span className="font-mono text-[9px] text-surface-600">{day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

StreakWidget.propTypes = {
  streak: PropTypes.shape({
    current_streak: PropTypes.number,
    longest_streak: PropTypes.number,
    weekly_activity: PropTypes.arrayOf(PropTypes.shape({ active: PropTypes.bool })),
  }),
}

function ProgressBar({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[10px]">
        <span className="truncate text-surface-400">{label}</span>
        <span className="ml-2 font-bold text-primary-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
        <div className="h-full rounded-full bg-primary-400 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

ProgressBar.propTypes = {
  label: PropTypes.string,
  value: PropTypes.number,
  max: PropTypes.number,
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const activePathId = useGoalsStore((s) => s.activePathId)

  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getDashboard(activePathId)
      setDashboard(data)
    } catch {
      setError('Unable to load workspace metrics. Please check connection and retry.')
    } finally {
      setLoading(false)
    }
  }, [activePathId])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    useGoalsStore.getState().fetchGoals()
  }, [])

  const progressPercent = Math.round((dashboard?.overall_progress || 0) * 100)
  const streak = dashboard?.streak || null
  const recentBadges = dashboard?.recent_badges || []
  const skillProgress = dashboard?.skill_progress || []
  const milestoneBreakdown = dashboard?.milestone_breakdown || []
  const hasAdaptations = (dashboard?.recent_adaptations || []).length > 0
  const currentStep = dashboard?.current_step || null
  const totalSteps = dashboard?.total_steps || 0
  const completedCount = dashboard?.completed_count ?? 0
  const currentMilestoneTitle = dashboard?.milestone_breakdown?.find(
    (m) => m.number === dashboard?.current_milestone
  )?.title

  return (
    <AppShell>
      <PageHeader
        tag="PATHFINDER / OVERVIEW"
        icon={LayoutDashboard}
        title="DASHBOARD"
        description="High-level overview of your active learning path: progress, streak, current module, and what to do next."
        actions={
          <Button onClick={() => navigate('/progress')} className="font-mono text-xs">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            OPEN PROGRESS
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} className="h-28" />
            ))}
          </div>
        )}

        {error && <ErrorState title="Overview Unavailable" description={error} onRetry={loadDashboard} />}

        {!loading && !error && dashboard && (
          <>
            <RoadmapSwitcher />

            {/* Active role + progress banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-primary-400/30 bg-primary-400/5 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-primary-400/40 bg-primary-400/10 font-mono text-sm font-bold text-primary-400">
                  {(dashboard.role_label || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-surface-500">CURRENT ACTIVE ROADMAP</p>
                  <p className="truncate text-sm font-semibold text-white">{dashboard.role_label || '—'}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                {dashboard.path_completed && (
                  <span className="flex items-center gap-1.5 rounded-[4px] border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-medium text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> PATH COMPLETED
                  </span>
                )}
                <span className="font-mono text-xs text-surface-300">{progressPercent}%</span>
                <Button onClick={() => navigate('/progress')} variant="outline" size="sm" className="font-mono text-[10px]">
                  View Full Roadmap
                </Button>
              </div>
            </div>

            {/* Top row: streak + overall progress + current module */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {streak && <StreakWidget streak={streak} />}

              {/* Overall progress */}
              <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  &gt; OVERALL PROGRESS
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-white">{progressPercent}%</p>
                    <p className="mt-0.5 font-mono text-[11px] text-surface-400">
                      {completedCount} / {totalSteps} steps completed
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-surface-500">
                    <p>{dashboard.milestones_completed || 0}/{dashboard.total_milestones || 0} MILESTONES</p>
                    {dashboard.skipped_count > 0 && (
                      <p className="mt-1 text-surface-600">{dashboard.skipped_count} skipped</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-800">
                  <div className="h-full rounded-full bg-primary-400 transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                </div>
                {dashboard.estimated_completion && (
                  <p className="mt-2 font-mono text-[10px] text-surface-500">
                    Est. completion: {dashboard.estimated_completion}
                  </p>
                )}
              </div>

              {/* Current module */}
              <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                  <Target className="h-3.5 w-3.5" />
                  &gt; CURRENT MODULE
                </div>
                {currentStep ? (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-white leading-snug">{currentStep.title}</p>
                    <p className="mt-1.5 font-mono text-[10px] text-surface-500">
                      Milestone {currentStep.milestone} • {currentMilestoneTitle || `Milestone ${currentStep.milestone}`}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-surface-500">
                      Step {currentStep.order} · ~{currentStep.estimated_hours || '?'}h estimated
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-surface-400">
                    {dashboard.path_completed ? 'Roadmap complete — great work!' : 'No active module yet.'}
                  </div>
                )}
              </div>
            </div>

            {/* Milestone overview (compact) */}
            {milestoneBreakdown.length > 0 && (
              <div className="rounded-[8px] border border-surface-800 bg-surface-900/50 p-5">
                <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                  <Target className="h-3.5 w-3.5" />
                  &gt; MILESTONE OVERVIEW
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {milestoneBreakdown.map((m) => (
                    <div key={m.number} className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="truncate text-surface-300">
                          {String(m.number).padStart(2, '0')}. {m.title}
                        </span>
                        <span className={`ml-2 shrink-0 ${m.completed_steps === m.total_steps ? 'text-emerald-400' : 'text-primary-400'}`}>
                          {m.progress_percentage ?? 0}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            m.completed_steps === m.total_steps ? 'bg-emerald-400' : 'bg-primary-400'
                          }`}
                          style={{ width: `${m.progress_percentage ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next recommended action */}
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-5">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                <Sparkles className="h-3.5 w-3.5" />
                &gt; NEXT UP
              </div>
              {dashboard.next_action ? (
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">{dashboard.next_action.title}</p>
                    <p className="mt-1.5 text-xs text-surface-400 leading-relaxed">{dashboard.next_action.reason}</p>
                    {dashboard.next_action.estimated_hours && (
                      <p className="mt-1 font-mono text-[10px] text-surface-500">~{dashboard.next_action.estimated_hours}h estimated</p>
                    )}
                  </div>
                  <Button
                    onClick={() => navigate('/progress')}
                    className="shrink-0 font-mono text-xs"
                  >
                    Continue Learning <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="mt-3 text-sm text-surface-400">No recommended action right now.</div>
              )}
            </div>

            {/* Skills + Badges */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Skill progress */}
              <div className="rounded-[8px] border border-surface-800 bg-surface-900/50 p-5">
                <div className="mb-4 flex items-center gap-2 border-b border-surface-800 pb-3 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                  <BookOpen className="h-3.5 w-3.5" />
                  &gt; SKILL PROGRESS
                </div>
                {skillProgress.length > 0 ? (
                  <div className="space-y-3">
                    {skillProgress.slice(0, 8).map((s) => (
                      <ProgressBar
                        key={s.skill_name}
                        label={s.skill_name}
                        value={s.progress_percentage}
                        max={100}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No skill data yet" description="Complete steps to track skill progress." />
                )}
              </div>

              {/* Recent badges */}
              <div className="rounded-[8px] border border-surface-800 bg-surface-900/50 p-5">
                <div className="mb-4 flex items-center gap-2 border-b border-surface-800 pb-3 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                  <Trophy className="h-3.5 w-3.5" />
                  &gt; RECENT BADGES
                </div>
                {recentBadges.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {recentBadges.map((badge, i) => (
                      <div
                        key={badge.badge_id || i}
                        className="flex items-center gap-3 rounded-[6px] border border-surface-800 bg-surface-950/60 p-3"
                      >
                        <span className="text-2xl shrink-0" role="img" aria-label={badge.badge_name}>
                          {badge.icon || '🏅'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">{badge.badge_name}</p>
                          {badge.earned_at && (
                            <p className="mt-0.5 font-mono text-[10px] text-surface-500">{badge.earned_at.split('T')[0]}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Trophy} title="No badges yet" description="Complete milestones to earn badges." />
                )}
              </div>
            </div>

            {/* Recent adaptation/activity */}
            {hasAdaptations && (
              <div className="rounded-[8px] border border-surface-800 bg-surface-900/50 p-5">
                <div className="mb-4 flex items-center gap-2 border-b border-surface-800 pb-3 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                  <Award className="h-3.5 w-3.5" />
                  &gt; RECENT ACTIVITY
                </div>
                <ul className="space-y-2.5">
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
                          {a.created_at?.split('T')[0] || 'Recently'} · {a.trigger?.replace('_', ' ').toUpperCase()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* View full roadmap footer CTA */}
            <div className="flex items-center justify-between rounded-[8px] border border-surface-800 bg-surface-900/50 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">See your full learning journey</p>
                <p className="mt-0.5 font-mono text-[10px] text-surface-500">Every milestone, every step, end to end.</p>
              </div>
              <Button onClick={() => navigate('/roadmap')} variant="outline" className="font-mono text-xs">
                <Map className="h-3.5 w-3.5" aria-hidden="true" />
                View Roadmap
              </Button>
            </div>
          </>
        )}

        {!loading && !error && !dashboard && (
          <EmptyState
            icon={Map}
            title="No workspace yet"
            description="Set up your learning profile to see your dashboard."
            action={
              <Button onClick={() => navigate('/onboarding')} className="font-mono text-xs">
                Get Started
              </Button>
            }
          />
        )}
      </div>
    </AppShell>
  )
}
