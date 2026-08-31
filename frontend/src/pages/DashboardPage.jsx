import { useEffect, useState, useCallback } from'react'
import { useNavigate } from'react-router-dom'
import PropTypes from'prop-types'
import { motion } from'framer-motion'
import {
 ArrowRight, CheckCircle2, Flame, Map, Sparkles,
 Target, TrendingUp, Trophy, BookOpen, Zap,
} from'lucide-react'
import { AppShell } from'../components/layout/AppShell'
import { Button } from'../components/ui/Button'
import { ProgressBar } from'../components/ui/Progress'
import { CountUp } from'../components/ui/CountUp'
import { Skeleton } from'../components/ui/Skeleton'
import { ErrorState } from'../components/ui/ErrorState'
import { EmptyState } from'../components/ui/EmptyState'
import { useAuth } from'../context/AuthContext'
import api from'../services/api'
import useGoalsStore from'../store/useGoalsStore'
import useUserStore from'../store/useUserStore'
import { EASE } from'../lib/motion'

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const stagger = {
 hidden: {},
 show: { transition: { staggerChildren: 0.07 } },
}

const item = {
 hidden: { opacity: 0, y: 12 },
 show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

function greeting() {
 const h = new Date().getHours()
 if (h >= 5 && h < 12) return'Good morning'
 if (h >= 12 && h < 17) return'Good afternoon'
 if (h >= 17 && h < 22) return'Good evening'
 return'Good evening'
}

function StreakWidget({ streak }) {
 const current = streak?.current_streak ?? 0
 const longest = streak?.longest_streak ?? 0
 const weekly = streak?.weekly_activity || []
 const slots = DAY_LABELS.map((day, i) => ({ day, active: weekly[i]?.active ?? false }))

 return (
 <div>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <Flame className="h-4 w-4 text-streak-500" aria-hidden="true" />
 <CountUp value={current} duration={700} className="text-lg text-ink" />
 <span className="text-xs text-ink-400">
 day{current !== 1 ?'s' :''}
 </span>
 </div>
 <span className="text-[10px] font-medium text-ink-400">
 longest {longest}
 </span>
 </div>
 <div className="mt-3 flex items-center gap-1.5">
 {slots.map(({ day, active }, i) => (
 <motion.div
 key={day}
 initial={{ scale: 0.6, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ delay: 0.12 + i * 0.04, type:'spring', stiffness: 420, damping: 24 }}
 className={`h-6 flex-1 rounded-md transition-colors ${
 active ?'bg-streak-500/25' :'bg-line/50'
 }`}
 title={day}
 />
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

function DashboardSkeleton() {
 return (
 <div className="space-y-8">
 <div className="space-y-3">
 <Skeleton className="h-7 w-64" />
 <Skeleton className="h-4 w-80 max-w-full" />
 </div>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {[0, 1, 2, 3].map((i) => (
 <Skeleton key={i} className="h-32 w-full rounded-xl" />
 ))}
 </div>
 <div className="space-y-3 rounded-xl border border-line bg-surface p-6 shadow-card">
 <Skeleton className="h-3 w-28" />
 <Skeleton className="h-7 w-56" />
 <Skeleton className="h-2.5 w-full" />
 </div>
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
 {[0, 1].map((i) => (
 <div key={i} className="space-y-3 rounded-xl border border-line bg-surface p-6 shadow-card">
 <Skeleton className="h-3 w-32" />
 <Skeleton className="h-2.5 w-full" />
 <Skeleton className="h-2.5 w-4/5" />
 </div>
 ))}
 </div>
 </div>
 )
}

const ACCENT_CARDS = [
 {
 key:'streak',
 label:'Current Streak',
 icon: Flame,
 grad:'from-streak-500/15 to-streak-400/5',
 iconBg:'bg-streak-500/15 text-streak-600',
 border:'border-streak-200/60',
 glow:'shadow-glow-streak',
 },
 {
 key:'progress',
 label:'Overall Progress',
 icon: TrendingUp,
 grad:'from-primary-500/15 to-primary-400/5',
 iconBg:'bg-primary-500/15 text-primary-600',
 border:'border-primary-200/60',
 glow:'shadow-glow-primary',
 },
 {
 key:'module',
 label:'Current Module',
 icon: Map,
 grad:'from-primary-500/15 to-primary-400/5',
 iconBg:'bg-primary-500/15 text-primary-600',
 border:'border-primary-200/60',
 glow:'shadow-glow-ai',
 },
 {
 key:'badges',
 label:'Badges Earned',
 icon: Trophy,
 grad:'from-badge-500/15 to-primary-400/5',
 iconBg:'bg-badge-500/15 text-badge-600',
 border:'border-badge-200/60',
 glow:'shadow-glow-streak',
 },
]

export default function DashboardPage() {
 const navigate = useNavigate()
 const { user: authUser } = useAuth()
 const { profile } = useUserStore()
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
 setError('Unable to load your workspace metrics. Please check connection and retry.')
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
 const adaptations = dashboard?.recent_adaptations || []
 const currentStep = dashboard?.current_step || null
 const totalSteps = dashboard?.total_steps || 0
 const completedCount = dashboard?.completed_count ?? 0
 const skippedCount = dashboard?.skipped_count ?? 0
 const currentMilestoneTitle =
 dashboard?.milestone_breakdown?.find((m) => m.number === dashboard?.current_milestone)?.title ||''

 const roleLabel = dashboard?.role_label || profile?.goal ||'your goal'
 const name = (authUser?.name ||'learner')
 .split('')
 .filter(Boolean)
 .slice(0, 1)
 .join('')
 const hasPath = Boolean(dashboard?.path_id)

 return (
 <AppShell>
 <div className="space-y-8">
 {loading && <DashboardSkeleton />}

 {error && (
 <ErrorState
 title="Overview unavailable"
 description={error}
 onRetry={loadDashboard}
 />
 )}

 {!loading && !error && dashboard && hasPath && (
 <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
 <motion.div variants={item}>
 <div className="flex flex-wrap items-end justify-between gap-4">
 <div>
 <p className="section-label mb-2 text-primary-600">
 {dashboard.path_completed ?'Roadmap complete' :'Your workspace'}
 </p>
 <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
 {greeting()}, {name}.
 </h1>
 <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">
 {dashboard.path_completed
 ?`You finished the ${roleLabel} path. Add a new one or revisit your journey below.`
 :`Continue building toward ${roleLabel} — one focused step at a time.`}
 </p>
 </div>
 <div className="flex items-baseline gap-2">
 <CountUp value={progressPercent} className="text-4xl text-primary-600" />
 <span className="text-sm text-ink-400">% overall</span>
 </div>
 </div>
 <div className="mt-5">
 <ProgressBar value={progressPercent} max={100} tone={dashboard.path_completed ?'emerald' :'gradient'} className="h-2" />
 </div>
 </motion.div>

 {/* Colorful stat cards */}
 <motion.div variants={item}>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {ACCENT_CARDS.map((card) => {
 const Icon = card.icon
 let value
 let suffix
 if (card.key ==='streak') {
 value = streak?.current_streak ?? 0
 suffix ='days'
 } else if (card.key ==='progress') {
 value = progressPercent
 suffix ='%'
 } else if (card.key ==='module') {
 value = Math.max(0, dashboard?.current_milestone ?? 0)
 suffix ='milestone'
 } else {
 value = recentBadges.length
 suffix ='earned'
 }
 return (
 <div
 key={card.key}
 className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${card.border} ${card.grad} p-5 transition-all duration-200 hover:-translate-y-0.5 ${card.glow}`}
 >
 <div className="flex items-start justify-between">
 <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}>
 <Icon className="h-5 w-5" aria-hidden="true" />
 </span>
 <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
 {card.label}
 </span>
 </div>
 <div className="mt-4 flex items-baseline gap-1.5">
 <CountUp value={value} className="text-2xl font-semibold text-ink" />
 <span className="text-xs text-ink-400">{suffix}</span>
 </div>
 </div>
 )
 })}
 </div>
 </motion.div>

 {/* Current focus */}
 <motion.div variants={item}>
 <div className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-card">
 <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" aria-hidden="true" />
 <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <span className="flex items-center gap-1.5 text-xs font-medium text-primary-700">
 <Target className="h-3.5 w-3.5" aria-hidden="true" />
 Current focus
 </span>
 {dashboard.path_completed && (
 <span className="inline-flex items-center gap-1 rounded-full border border-success-200 bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">
 <CheckCircle2 className="h-3 w-3" /> Completed
 </span>
 )}
 </div>

 {currentStep ? (
 <>
 <h2 className="mt-3 text-xl font-semibold leading-snug text-ink sm:text-2xl">
 {currentStep.title}
 </h2>
 <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">
 Milestone{''}
 <span className="font-medium text-ink-300">
 {String(currentStep.milestone).padStart(2,'0')}
 </span>
 {currentMilestoneTitle ? (
 <>
 {' ·'}
 {currentMilestoneTitle}
 </>
 ) : null}
 {' ·'}
 <span className="font-medium text-ink-300">
 Step {currentStep.order}
 </span>
 {' ·'}
 ~{currentStep.estimated_hours ||'?'}h estimated
 </p>
 </>
 ) : (
 <h2 className="mt-3 text-xl font-semibold text-ink sm:text-2xl">
 {dashboard.path_completed
 ?'Every step is accounted for.'
 :'No active step yet.'}
 </h2>
 )}

 <div className="mt-4 flex flex-wrap gap-2">
 <span className="text-xs text-ink-400">
 <span className="font-medium text-ink-300">{completedCount}/{totalSteps}</span> steps done
 </span>
 {skippedCount > 0 && (
 <span className="text-xs text-ink-400">· {skippedCount} skipped</span>
 )}
 {dashboard.estimated_completion && (
 <span className="text-xs text-ink-400">
 · est. completion {dashboard.estimated_completion}
 </span>
 )}
 </div>
 </div>

 <div className="shrink-0">
 <Button
 onClick={() => navigate('/progress')}
 size="lg"
 className="min-w-44"
 >
 Continue learning
 <ArrowRight className="h-4 w-4" aria-hidden="true" />
 </Button>
 </div>
 </div>
 </div>
 </motion.div>

 {/* Roadmap overview + today */}
 <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr]">
 <motion.section variants={item}>
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold tracking-tight text-ink">
 Roadmap overview
 </h2>
 <button
 onClick={() => navigate('/roadmap')}
 className="flex items-center gap-1 text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 focus:outline-none"
 >
 View full roadmap <ArrowRight className="h-3 w-3" aria-hidden="true" />
 </button>
 </div>

 {milestoneBreakdown.length > 0 ? (
 <div className="mt-5 divide-y divide-line/60">
 {milestoneBreakdown.map((m) => {
 const done = m.completed_steps === m.total_steps && m.total_steps > 0
 const isCurrent = m.number === dashboard?.current_milestone
 return (
 <button
 key={m.number}
 onClick={() => navigate('/roadmap')}
 className="group flex w-full items-center gap-4 py-3.5 text-left focus:outline-none"
 >
 <span
 className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${
 done
 ?'border-success-200 bg-success-50 text-success-600'
 : isCurrent
 ?'border-primary-200 bg-primary-50 text-primary-700'
 :'border-line-strong text-ink-400'
 }`}
 >
 {done ? (
 <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
 ) : (
 String(m.number).padStart(2,'0')
 )}
 </span>
 <span className="min-w-0 flex-1">
 <span className="flex items-center justify-between gap-3">
 <span className="truncate text-[13px] font-medium text-ink group-hover:text-primary-700">
 {m.title}
 </span>
 <span className={`shrink-0 text-[11px] font-medium ${done ?'text-success-600' :'text-ink-400'}`}>
 {Math.round(m.progress_percentage || 0)}%
 </span>
 </span>
 <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-line/60">
 <span
 className={`block h-full rounded-full ${done ?'bg-success-500' :'bg-gradient-to-r from-primary-500 to-primary-700'}`}
 style={{ width:`${Math.round(m.progress_percentage || 0)}%` }}
 />
 </span>
 </span>
 </button>
 )
 })}
 </div>
 ) : (
 <p className="mt-5 text-sm text-ink-400">
 No roadmap yet — start learning to shape one.
 </p>
 )}
 </motion.section>

 <motion.section variants={item} className="space-y-8">
 <div>
 <h2 className="text-lg font-semibold tracking-tight text-ink">Today</h2>
 <div className="mt-5 rounded-xl border border-line bg-surface p-5 shadow-card">
 {streak ? (
 <StreakWidget streak={streak} />
 ) : (
 <p className="text-sm text-ink-400">
 Mark a step complete to build your streak.
 </p>
 )}
 </div>
 </div>

 {dashboard.next_action && (
 <div>
 <h2 className="text-lg font-semibold tracking-tight text-ink">Next up</h2>
 <div className="mt-5 rounded-xl border border-line bg-surface p-5 shadow-card">
 <p className="text-sm font-medium text-ink">
 {dashboard.next_action.title}
 </p>
 <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
 {dashboard.next_action.reason}
 </p>
 <button
 onClick={() => navigate('/progress')}
 className="mt-3 flex items-center gap-1 text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 focus:outline-none"
 >
 Get started <ArrowRight className="h-3 w-3" aria-hidden="true" />
 </button>
 </div>
 </div>
 )}
 </motion.section>
 </div>

 {/* Skills + badges */}
 <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
 <motion.section variants={item}>
 <div className="flex items-center justify-between">
 <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
 <BookOpen className="h-4 w-4 text-ink-400" aria-hidden="true" />
 Skills
 </h2>
 {skillProgress.length > 0 && (
 <span className="text-xs text-ink-400">
 {skillProgress.length} tracked
 </span>
 )}
 </div>
 {skillProgress.length > 0 ? (
 <div className="mt-5 space-y-4">
 {skillProgress.slice(0, 8).map((s) => {
 const pct = Math.round(s.progress_percentage || 0)
 return (
 <div key={s.skill_name}>
 <div className="mb-1.5 flex items-center justify-between text-xs">
 <span className="text-ink-300">{s.skill_name}</span>
 <span className="font-medium text-ink-400">{pct}%</span>
 </div>
 <ProgressBar value={pct} max={100} tone="gradient" className="h-1.5" delay={0.08} />
 </div>
 )
 })}
 </div>
 ) : (
 <p className="mt-5 text-sm text-ink-400">
 Complete steps to build your skill profile.
 </p>
 )}
 </motion.section>

 <motion.section variants={item}>
 <div className="flex items-center justify-between">
 <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
 <Trophy className="h-4 w-4 text-ink-400" aria-hidden="true" />
 Badges
 </h2>
 {recentBadges.length > 0 && <span className="text-xs text-ink-400">recent</span>}
 </div>
 {recentBadges.length > 0 ? (
 <div className="mt-5 grid grid-cols-2 gap-3">
 {recentBadges.map((badge, i) => (
 <div
 key={badge.badge_id || i}
 className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary-200"
 >
 <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-badge-500/15 to-primary-500/15 text-base">
 {badge.icon ||'🏅'}
 </span>
 <div className="min-w-0">
 <p className="truncate text-xs font-medium text-ink">
 {badge.badge_name}
 </p>
 {badge.earned_at && (
 <p className="mt-0.5 text-[10px] text-ink-400">
 {badge.earned_at.split('T')[0]}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="mt-5 text-sm text-ink-400">
 Finish milestones to earn badges.
 </p>
 )}
 </motion.section>
 </div>

 {/* Recent activity */}
 {adaptations.length > 0 && (
 <motion.section variants={item}>
 <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
 <Zap className="h-4 w-4 text-ink-400" aria-hidden="true" />
 Recent activity
 </h2>
 <ul className="mt-5 space-y-2.5">
 {adaptations.map((a, i) => (
 <li key={i} className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-soft">
 <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-ai-500/15 to-primary-500/15 text-ai-600">
 <Sparkles className="h-3 w-3" aria-hidden="true" />
 </span>
 <div className="min-w-0 flex-1">
 <p className="text-xs leading-relaxed text-ink-300">{a.explanation}</p>
 <p className="mt-1 text-[10px] text-ink-400">
 {a.created_at?.split('T')[0] ||'Recently'}
 </p>
 </div>
 </li>
 ))}
 </ul>
 </motion.section>
 )}
 </motion.div>
 )}

 {!loading && !error && dashboard && !hasPath && (
 <EmptyState
 icon={Map}
 title="No roadmap yet"
 description="Create a learning path to see your dashboard come to life."
 action={
 <Button onClick={() => navigate('/onboarding')}>Get started</Button>
 }
 />
 )}

 {/* Trending into progress */}
 {!loading && !error && hasPath && (
 <div className="flex justify-end">
 <button
 onClick={() => navigate('/progress')}
 className="flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-primary-700 focus:outline-none"
 >
 <TrendingUp className="h-4 w-4" aria-hidden="true" />
 Open progress
 </button>
 </div>
 )}
 </div>
 </AppShell>
 )
}
