import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Map, ArrowRight, Sparkles, CheckCircle2,
  Flame, Trophy, TrendingUp, BookOpen, Target, Zap,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { SectionHeading } from '../components/shared/SectionHeading'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressBar, Ring } from '../components/ui/Progress'
import { CountUp } from '../components/ui/CountUp'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { RoadmapSwitcher } from '../components/roles/RoadmapSwitcher'
import api from '../services/api'
import useGoalsStore from '../store/useGoalsStore'
import { EASE } from '../lib/motion'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

function StreakWidget({ streak }) {
  const current = streak?.current_streak ?? 0
  const longest = streak?.longest_streak ?? 0
  const weekly = streak?.weekly_activity || []
  const slots = DAY_LABELS.map((day, i) => ({ day, active: weekly[i]?.active ?? false }))

  return (
    <Card padded>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-primary-400/25 bg-primary-400/[0.08] text-primary-400">
            <Flame className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="section-label text-surface-500">Streak</p>
            <p className="flex items-baseline gap-1.5">
              <CountUp value={current} duration={700} className="text-2xl" />
              <span className="text-xs text-surface-400">day{current !== 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="section-label text-surface-600">Longest</p>
          <p className="font-mono text-sm font-semibold text-surface-200">{longest}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5">
        {slots.map(({ day, active }, i) => (
          <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 420, damping: 24 }}
              className={`h-7 w-full rounded-[6px] border transition-colors ${
                active
                  ? 'border-primary-400/50 bg-primary-400/20'
                  : 'border-surface-800 bg-surface-900'
              }`}
              title={day}
            >
              {active && (
                <div className="flex h-full items-center justify-center">
                  <Flame className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                </div>
              )}
            </motion.div>
            <span className="font-mono text-[9px] text-surface-600">{day[0]}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

StreakWidget.propTypes = {
  streak: PropTypes.shape({
    current_streak: PropTypes.number,
    longest_streak: PropTypes.number,
    weekly_activity: PropTypes.arrayOf(PropTypes.shape({ active: PropTypes.bool })),
  }),
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[12px] border border-surface-800 bg-surface-925 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-[10px]" />
              <div className="space-y-2">
                <Skeleton className="h-2 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <Skeleton className="mt-5 h-7 w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-[12px] border border-surface-800 bg-surface-925 p-5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-4/5" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
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
        tag="Overview"
        icon={LayoutDashboard}
        title="Dashboard"
        description="High-level overview of your active learning path: progress, streak, current module, and what to do next."
        actions={
          <Button onClick={() => navigate('/progress')}>
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Open Progress
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        {loading && <DashboardSkeleton />}

        {error && (
          <ErrorState
            title="Overview unavailable"
            description={error}
            onRetry={loadDashboard}
          />
        )}

        {!loading && !error && dashboard && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={item}>
              <RoadmapSwitcher />
            </motion.div>

            {/* Active role + progress banner */}
            <motion.div variants={item}>
              <Card accent padded className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-primary-400/40 bg-primary-400/10 font-mono text-base font-bold text-primary-400">
                    {(dashboard.role_label || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="section-label text-primary-400/80">Current Active Roadmap</p>
                    <p className="truncate text-[15px] font-semibold text-white">{dashboard.role_label || '—'}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {dashboard.path_completed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Path completed
                    </span>
                  )}
                  <span className="stat-number text-lg text-primary-400">{progressPercent}%</span>
                  <Button onClick={() => navigate('/progress')} variant="outline" size="sm">
                    View Progress
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Top row: streak + overall progress + current module */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <motion.div variants={item}>{streak && <StreakWidget streak={streak} />}</motion.div>

              {/* Overall progress */}
              <motion.div variants={item}>
                <Card padded className="h-full">
                  <SectionHeading icon={TrendingUp}>Overall Progress</SectionHeading>
                  <div className="mt-4 flex items-center gap-5">
                    <Ring value={progressPercent} max={100} size={88} stroke={7}>
                      <CountUp value={progressPercent} className="text-lg" />
                      <span className="font-mono text-[9px] text-surface-500">%</span>
                    </Ring>
                    <div className="min-w-0 flex-1">
                      <ProgressBar value={progressPercent} max={100} />
                      <p className="mt-2 font-mono text-[11px] text-surface-400">
                        {completedCount} / {totalSteps} steps
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-surface-500">
                        {dashboard.milestones_completed || 0}/{dashboard.total_milestones || 0} milestones
                      </p>
                      {dashboard.estimated_completion && (
                        <p className="mt-1 font-mono text-[10px] text-surface-500">
                          Est. completion: {dashboard.estimated_completion}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Current module */}
              <motion.div variants={item}>
                <Card padded className="h-full">
                  <SectionHeading icon={Target}>Current Module</SectionHeading>
                  {currentStep ? (
                    <div className="mt-4">
                      <p className="text-[15px] font-semibold leading-snug text-white">{currentStep.title}</p>
                      <p className="mt-2 font-mono text-[11px] text-surface-500">
                        Milestone {currentStep.milestone}
                        {currentMilestoneTitle ? ` · ${currentMilestoneTitle}` : ''}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="badge-line font-mono text-[10px]">Step {currentStep.order}</span>
                        <span className="badge-line font-mono text-[10px]">~{currentStep.estimated_hours || '?'}h est.</span>
                      </div>
                      <Button
                        onClick={() => navigate('/progress')}
                        variant="outline"
                        size="sm"
                        className="mt-4"
                      >
                        Continue Now <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-surface-400">
                      {dashboard.path_completed ? 'Roadmap complete — great work!' : 'No active module yet.'}
                    </p>
                  )}
                </Card>
              </motion.div>
            </div>

            {/* Milestone overview (compact) */}
            {milestoneBreakdown.length > 0 && (
              <motion.div variants={item}>
                <Card padded>
                  <SectionHeading icon={Map} trailing={<span className="section-label text-surface-600">progress stats</span>}>
                    Milestone Overview
                  </SectionHeading>
                  <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                    {milestoneBreakdown.map((m) => {
                      const pct = m.progress_percentage ?? 0
                      const done = m.completed_steps === m.total_steps
                      return (
                        <div key={m.number}>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-xs text-surface-300">
                              <span className="font-mono text-surface-500">{String(m.number).padStart(2, '0')}.</span>{' '}
                              {m.title}
                            </span>
                            <span className={`shrink-0 font-mono text-[11px] ${done ? 'text-emerald-400' : 'text-primary-400'}`}>
                              {pct}%
                            </span>
                          </div>
                          <ProgressBar value={pct} max={100} tone={done ? 'emerald' : 'gold'} className="h-1.5" />
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Next recommended action */}
            <motion.div variants={item}>
              <Card raised padded>
                <SectionHeading icon={Sparkles} prefix=">" >Next Up</SectionHeading>
                {dashboard.next_action ? (
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-white">{dashboard.next_action.title}</p>
                        {dashboard.next_action.estimated_hours && (
                          <span className="badge-line font-mono text-[10px]">~{dashboard.next_action.estimated_hours}h</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-surface-400">{dashboard.next_action.reason}</p>
                    </div>
                    <Button onClick={() => navigate('/progress')} className="shrink-0">
                      Continue Learning <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-surface-400">No recommended action right now.</p>
                )}
              </Card>
            </motion.div>

            {/* Skills + Badges */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <motion.div variants={item}>
                <Card padded>
                  <SectionHeading icon={BookOpen} trailing={skillProgress.length > 0 && <span className="section-label text-surface-600">{skillProgress.length} skills</span>}>
                    Skill Progress
                  </SectionHeading>
                  {skillProgress.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {skillProgress.slice(0, 8).map((s) => (
                        <div key={s.skill_name}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs text-surface-200">{s.skill_name}</span>
                            <span className="font-mono text-[11px] text-primary-400">{Math.round(s.progress_percentage || 0)}%</span>
                          </div>
                          <ProgressBar value={s.progress_percentage || 0} max={100} tone="gold" className="h-1.5" delay={0.1} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <EmptyState title="No skill data yet" description="Complete steps to track skill progress." />
                    </div>
                  )}
                </Card>
              </motion.div>

              <motion.div variants={item}>
                <Card padded>
                  <SectionHeading icon={Trophy} trailing={recentBadges.length > 0 && <span className="section-label text-surface-600">recent</span>}>
                    Recent Badges
                  </SectionHeading>
                  {recentBadges.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {recentBadges.map((badge, i) => (
                        <div
                          key={badge.badge_id || i}
                          className="group flex items-center gap-3 rounded-[10px] border border-surface-800 bg-surface-950/60 p-3 transition-all hover:-translate-y-0.5 hover:border-primary-400/30"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-surface-800 bg-surface-900 text-base transition-colors group-hover:border-primary-400/40">
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
                    <div className="mt-4">
                      <EmptyState icon={Trophy} title="No badges yet" description="Complete milestones to earn badges." />
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>

            {/* Recent adaptation/activity */}
            {hasAdaptations && (
              <motion.div variants={item}>
                <Card padded>
                  <SectionHeading icon={Zap} trailing={<span className="section-label text-surface-600">auto-adaptations</span>}>
                    Recent Activity
                  </SectionHeading>
                  <ul className="mt-4 space-y-2.5">
                    {dashboard.recent_adaptations.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-[10px] border border-surface-800 bg-surface-950/70 p-3.5 transition-colors hover:border-surface-700"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-primary-400/30 bg-primary-400/10 text-primary-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-relaxed text-surface-200">{a.explanation}</p>
                          <p className="mt-1 font-mono text-[10px] text-surface-500">
                            {a.created_at?.split('T')[0] || 'Recently'} · {a.trigger?.replace('_', ' ')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}

            {/* View full roadmap footer CTA */}
            <motion.div variants={item}>
              <div className="flex flex-col gap-4 rounded-[12px] border border-primary-400/20 bg-gradient-to-r from-primary-400/[0.06] to-transparent px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">See your full learning journey</p>
                  <p className="mt-0.5 text-xs text-surface-400">Every milestone, every step, end to end.</p>
                </div>
                <Button onClick={() => navigate('/roadmap')} variant="outline">
                  <Map className="h-4 w-4" aria-hidden="true" />
                  View Roadmap
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {!loading && !error && !dashboard && (
          <EmptyState
            icon={Map}
            title="No workspace yet"
            description="Set up your learning profile to see your dashboard."
            action={
              <Button onClick={() => navigate('/onboarding')}>Get Started</Button>
            }
          />
        )}
      </div>
    </AppShell>
  )
}