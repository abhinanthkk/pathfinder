import { useEffect, useState, useCallback } from'react'
import { useNavigate } from'react-router-dom'
import PropTypes from'prop-types'
import { motion, AnimatePresence } from'framer-motion'
import {
 Activity, Target, Check, SkipForward, ChevronDown, ChevronRight,
 CheckCircle2, XCircle, Clock, Flame, ArrowRight, Flag, Trophy, BookOpen,
} from'lucide-react'
import { AppShell } from'../components/layout/AppShell'
import { PageHeader } from'../components/shared/PageHeader'
import { Button } from'../components/ui/Button'
import { ProgressBar, Ring } from'../components/ui/Progress'
import { CountUp } from'../components/ui/CountUp'
import { Modal } from'../components/ui/Modal'
import { Skeleton } from'../components/ui/Skeleton'
import { ErrorState } from'../components/ui/ErrorState'
import { EmptyState } from'../components/ui/EmptyState'
import { ResourceIcon } from'../components/shared/ResourceIcon'
import api from'../services/api'
import useGoalsStore from'../store/useGoalsStore'
import { useToast } from'../context/ToastContext'
import { resourceTone, getStepResources } from'../utils/resources'
import { EASE } from'../lib/motion'

const fadeUp = {
 hidden: { opacity: 0, y: 14 },
 show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
}

function StepResources({ step }) {
 const resources = getStepResources(step || { title:'' })
 if (!resources || resources.length === 0) return null
 return (
 <div className="flex flex-wrap gap-2">
 {resources.map((res) => (
 <a
 key={res.source + res.url}
 href={res.url}
 target="_blank"
 rel="noopener noreferrer"
 className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 ${resourceTone(res.source)}`}
 >
 <ResourceIcon source={res.source} className="h-6 w-6" />
 {res.source ==='YouTube'
 ?'Watch Video'
 : res.source ==='GeeksforGeeks'
 ?'Learn'
 : res.source ==='W3Schools'
 ?'Practice'
 : res.title}
 </a>
 ))}
 </div>
 )
}
StepResources.propTypes = { step: PropTypes.object }

function BadgeCelebration({ badge, onClose }) {
 return (
 <Modal
 open={Boolean(badge)}
 onClose={onClose}
 tag="Badge earned"
 title={badge?.badge_name ||'Badge earned'}
 description="Milestone complete. Your progress is being tracked."
 footer={
 <Button onClick={onClose} variant="secondary">
 Nice work
 </Button>
 }
 >
 <div className="flex flex-col items-center py-2 text-center">
 <motion.span
 initial={{ scale: 0, rotate: -18 }}
 animate={{ scale: 1, rotate: 0 }}
 transition={{ type:'spring', stiffness: 260, damping: 16 }}
 className="flex h-16 w-16 items-center justify-center rounded-2xl border border-badge-200 bg-gradient-to-br from-badge-500/15 to-primary-500/15 text-3xl"
 role="img"
 aria-label="badge"
 >
 {badge?.icon ||'🏅'}
 </motion.span>
 <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-700">
 <Trophy className="h-4 w-4" aria-hidden="true" />
 You earned a new badge
 </p>
 {badge?.description && (
 <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink-400">
 {badge.description}
 </p>
 )}
 </div>
 </Modal>
 )
}
BadgeCelebration.propTypes = { badge: PropTypes.object, onClose: PropTypes.func.isRequired }

export default function ProgressPage() {
 const toast = useToast()
 const navigate = useNavigate()
 const activePathId = useGoalsStore((s) => s.activePathId)

 const [overview, setOverview] = useState(null)
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState(null)
 const [acting, setActing] = useState(null)
 const [skipConfirm, setSkipConfirm] = useState(false)
 const [historyOpen, setHistoryOpen] = useState({ completed: false, skipped: false })
 const [celebration, setCelebration] = useState(null)

 const resolvePathId = useCallback((preferred) => {
 if (typeof preferred ==='string' && preferred) return preferred
 const store = useGoalsStore.getState()
 if (store.activePathId) return store.activePathId
 const firstActive = (store.goals || []).find((g) => g.status ==='active')
 return firstActive?.path_id ||''
 }, [])

 const load = useCallback(
 async (preferredPathId) => {
 const target = resolvePathId(preferredPathId || activePathId)
 if (!target) {
 setLoading(false)
 setError(null)
 setOverview(null)
 return
 }
 if (target !== useGoalsStore.getState().activePathId) {
 useGoalsStore.setState({ activePathId: target })
 }
 setLoading(true)
 setError(null)
 try {
 const data = await api.getPathProgress(target)
 setOverview(data)
 } catch (err) {
 console.error('Progress load failed:', err?.response?.status, err?.message)
 setError(
 err?.response?.status === 404
 ?'This learning path is no longer available. Pick another roadmap to continue.'
 :'Unable to load your progress. Please check connection and retry.'
 )
 } finally {
 setLoading(false)
 }
 },
 [activePathId, resolvePathId]
 )

 useEffect(() => {
 let cancelled = false
 const boot = async () => {
 if (useGoalsStore.getState().goals.length === 0) {
 await useGoalsStore.getState().fetchGoals()
 }
 if (!cancelled) load()
 }
 boot()
 return () => {
 cancelled = true
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [])

 useEffect(() => {
 if (activePathId) load(activePathId)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [activePathId])

 const refreshAll = async () => {
 useGoalsStore.getState().fetchGoals()
 await load()
 }

 const handleComplete = async () => {
 const step = overview?.current_step
 if (!step || !activePathId) return
 setActing('complete')
 try {
 const res = await api.completeStep(activePathId, step.node_id)
 toast.success(`${step.title} marked complete!`)
 if (res?.new_badges?.length) {
 setCelebration(res.new_badges[0])
 }
 await refreshAll()
 } catch {
 toast.error('Failed to update progress.')
 } finally {
 setActing(null)
 }
 }

 const confirmSkip = async () => {
 const step = overview?.current_step
 if (!step || !activePathId) return
 setActing('skip')
 setSkipConfirm(false)
 try {
 await api.skipStep(activePathId, step.node_id)
 toast.info('Step skipped. The roadmap adapts to keep you moving.')
 await refreshAll()
 } catch {
 toast.error('Failed to skip step.')
 } finally {
 setActing(null)
 }
 }

 const toggleHistory = (key) => setHistoryOpen((prev) => ({ ...prev, [key]: !prev[key] }))

 if (!loading && !error && !activePathId) {
 return (
 <AppShell>
 <PageHeader
 tag="Progress"
 icon={Activity}
 title="Learning Progress"
 description="Continue your learning journey one step at a time."
 />
 <div className="mt-8 space-y-6">
 <EmptyState
 icon={Target}
 title="No learning roadmap yet"
 description="Create a learning path to start progressing through your roadmap."
 action={
 <Button onClick={() => navigate('/onboarding')}>Create learning path</Button>
 }
 />
 </div>
 </AppShell>
 )
 }

 const progressPercent = Math.round((overview?.overall_progress || 0) * 100)
 const currentStep = overview?.current_step || null
 const upcoming = overview?.upcoming_steps || []
 const completedSteps = overview?.completed_steps || []
 const skippedSteps = overview?.skipped_steps || []
 const completedCount = overview?.completed_count ?? completedSteps.length
 const skippedCount = overview?.skipped_count ?? skippedSteps.length
 const pathCompleted = overview?.path_completed
 const streak = overview?.streak
 const totalSteps = overview?.total_steps ?? 0

 return (
 <AppShell>
 <div className="space-y-8">
 <PageHeader
 tag={overview?.role_label ?`Progress / ${overview.role_label}` :'Progress'}
 icon={Activity}
 title="Learning Progress"
 description="Continue your learning journey one step at a time."
 />

 {loading && (
 <div className="space-y-6">
 <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div className="space-y-3">
 <Skeleton className="h-2.5 w-28" />
 <Skeleton className="h-7 w-64" />
 <Skeleton className="h-2.5 w-80 max-w-full" />
 </div>
 <Skeleton className="h-16 w-16 rounded-full" />
 </div>
 <Skeleton className="mt-6 h-2.5 w-full" />
 </div>
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {[0, 1, 2].map((i) => (
 <div key={i} className="rounded-xl border border-line bg-surface p-5 shadow-card">
 <Skeleton className="h-2.5 w-20" />
 <Skeleton className="mt-3 h-5 w-3/4" />
 <Skeleton className="mt-4 h-8 w-full" />
 </div>
 ))}
 </div>
 </div>
 )}

 {error && <ErrorState title="Progress unavailable" description={error} onRetry={() => load()} />}

 {!loading && !error && overview && (
 <>
 {/* Overall progress card with circular progress */}
 <motion.div
 variants={fadeUp}
 initial="hidden"
 animate="show"
 className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-card"
 >
 <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_240px_at_100%_-20%,rgba(217,154,0,0.07),transparent)]" aria-hidden="true" />
 <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" aria-hidden="true" />
 <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
 <div className="shrink-0">
 <Ring value={progressPercent} max={100} size={120} stroke={9} tone="gold">
 <div className="flex flex-col items-center">
 <CountUp value={progressPercent} className="text-2xl font-semibold text-primary-600" />
 <span className="text-[10px] font-medium text-ink-400">% complete</span>
 </div>
 </Ring>
 </div>

 <div className="min-w-0 flex-1">
 <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
 Overall progress
 </p>
 <div className="mt-1.5 flex items-baseline gap-2">
 <CountUp value={completedCount} className="text-4xl font-semibold text-primary-600" />
 <span className="text-sm text-ink-400">
 / {totalSteps} steps done
 </span>
 </div>
 {overview.estimated_completion && (
 <p className="mt-1.5 text-xs text-ink-400">
 Estimated completion {overview.estimated_completion}
 </p>
 )}
 <div className="mt-4 max-w-md">
 <ProgressBar value={progressPercent} max={100} tone={pathCompleted ?'emerald' :'gradient'} className="h-2" />
 </div>
 </div>

 <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
 {streak && (
 <span className="flex items-center gap-2 rounded-full border border-streak-200/70 bg-streak-50/60 px-3 py-1.5 text-sm text-ink">
 <Flame className="h-4 w-4 text-streak-500" aria-hidden="true" />
 <CountUp value={streak.current_streak ?? 0} className="font-semibold" />
 <span className="text-xs text-ink-400">day streak</span>
 </span>
 )}
 {pathCompleted && (
 <span className="inline-flex items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-2.5 py-1 text-[10px] font-medium text-success-700">
 <CheckCircle2 className="h-3 w-3" /> Path completed
 </span>
 )}
 </div>
 </div>
 </motion.div>

 {pathCompleted ? (
 <motion.div
 initial={{ opacity: 0, scale: 0.98 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ duration: 0.4, ease: EASE }}
 className="rounded-xl border border-success-200 bg-success-50/40 p-10 text-center"
 >
 <motion.span
 initial={{ scale: 0, rotate: -20 }}
 animate={{ scale: 1, rotate: 0 }}
 transition={{ type:'spring', stiffness: 260, damping: 18 }}
 className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-success-200 bg-surface text-3xl shadow-card"
 role="img"
 aria-label="trophy"
 >
 🏆
 </motion.span>
 <h2 className="mt-4 text-xl font-semibold text-ink">Path complete!</h2>
 <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-400">
 You&apos;ve finished the {overview.role_label} learning path. Every step is
 accounted for — great work.
 </p>
 <div className="mt-5 flex justify-center gap-3">
 <Button onClick={() => navigate('/roadmap')} variant="outline">
 <Flag className="h-4 w-4" aria-hidden="true" />
 View journey
 </Button>
 <Button onClick={() => navigate('/onboarding')} variant="ghost">
 Add another path
 </Button>
 </div>
 </motion.div>
 ) : (
 <>
 {/* NOW LEARNING */}
 <AnimatePresence mode="wait">
 {currentStep ? (
 <motion.div
 key={currentStep.node_id}
 variants={fadeUp}
 initial="hidden"
 animate="show"
 exit={{ opacity: 0, y: -8 }}
 >
 <div className="relative overflow-hidden rounded-xl border border-primary-200/70 bg-surface shadow-raised">
 <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" aria-hidden="true" />
 <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_260px_at_0%_0%,rgba(245,196,0,0.05),transparent)]" aria-hidden="true" />
 <div className="relative p-6 sm:p-8">
 <div className="flex flex-wrap items-center gap-2">
 <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-700">
 <span className="relative flex h-2 w-2">
 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-600 opacity-60" aria-hidden="true" />
 <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-600" aria-hidden="true" />
 </span>
 Now learning
 </span>
 <span className="rounded-full border border-line bg-surface-secondary px-2 py-0.5 text-[10px] font-medium text-ink-400">
 Milestone {String(currentStep.milestone).padStart(2,'0')}{overview.current_milestone_title ?` · ${overview.current_milestone_title}` :''} · Step {currentStep.order}
 </span>
 </div>

 <h2 className="mt-4 text-2xl font-semibold leading-snug text-ink sm:text-3xl">
 {currentStep.title}
 </h2>

 {currentStep.description && (
 <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
 {currentStep.description}
 </p>
 )}

 <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] font-medium text-ink-400">
 <span className="flex items-center gap-1.5">
 <Clock className="h-3.5 w-3.5" /> {currentStep.estimated_hours ||'?'} hours estimated
 </span>
 </div>

 <div className="mt-6 border-t border-line/60 pt-6">
 <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-ink-400">
 <BookOpen className="h-3.5 w-3.5" /> Resources
 </p>
 <StepResources step={currentStep} />
 </div>

 <div className="mt-6 flex flex-col gap-3 border-t border-line/60 pt-6 sm:flex-row">
 <Button
 onClick={handleComplete}
 loading={acting ==='complete'}
 size="lg"
 className="flex-1 text-sm"
 >
 <Check className="h-4 w-4" aria-hidden="true" />
 Mark as Complete
 </Button>
 <Button
 onClick={() => setSkipConfirm(true)}
 loading={acting ==='skip'}
 variant="secondary"
 size="lg"
 className="flex-1 text-sm"
 >
 <SkipForward className="h-4 w-4" aria-hidden="true" />
 Skip Step
 </Button>
 </div>
 </div>
 </div>
 </motion.div>
 ) : (
 <EmptyState
 icon={Target}
 title="No active step"
 description="There is no current step available for this roadmap right now."
 />
 )}
 </AnimatePresence>

 {/* UP NEXT */}
 {upcoming.length > 0 && (
 <section>
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold tracking-tight text-ink">
 Up next
 </h2>
 <span className="text-xs text-ink-400">
 {upcoming.length} step{upcoming.length !== 1 ?'s' :''} ahead
 </span>
 </div>
 <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {upcoming.slice(0, 6).map((s, i) => (
 <li
 key={s.node_id}
 className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card"
 >
 <div className="flex min-w-0 items-center gap-3">
 <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-50 to-primary-100 text-[11px] font-semibold text-primary-700">
 {i + 1}
 </span>
 <div className="min-w-0">
 <p className="truncate text-sm font-medium text-ink">{s.title}</p>
 <p className="mt-0.5 text-[10px] text-ink-400">
 Milestone {s.milestone} · Step {s.order}
 </p>
 </div>
 </div>
 <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-ink-400">
 <Clock className="h-3 w-3" /> {s.estimated_hours ||'?'}h estimated
 </span>
 </li>
 ))}
 </ol>
 </section>
 )}

 {/* Completed / skipped (collapsed) */}
 {(completedCount > 0 || skippedCount > 0) && (
 <section>
 {completedCount > 0 && (
 <ContentCollapsed
 expanded={historyOpen.completed}
 onToggle={() => toggleHistory('completed')}
 label={`${completedCount} completed step${completedCount !== 1 ?'s' :''}`}
 viewLabel="View previously completed"
 tone="success"
 panel={
 completedCount > 0 && (
 <ul className="mt-4 space-y-2">
 {completedSteps.map((s) => (
 <li
 key={s.node_id}
 className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-xs"
 >
 <div className="flex min-w-0 items-center gap-2">
 <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
 <span className="truncate text-ink-300">{s.title}</span>
 </div>
 <span className="shrink-0 text-[10px] text-ink-400">
 M{s.milestone}·{s.order}
 </span>
 </li>
 ))}
 </ul>
 )
 }
 />
 )}
 {skippedCount > 0 && (
 <ContentCollapsed
 expanded={historyOpen.skipped}
 onToggle={() => toggleHistory('skipped')}
 label={`${skippedCount} skipped step${skippedCount !== 1 ?'s' :''}`}
 viewLabel="View skipped"
 tone="neutral"
 panel={
 skippedCount > 0 && (
 <ul className="mt-4 space-y-2">
 {skippedSteps.map((s) => (
 <li
 key={s.node_id}
 className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-xs"
 >
 <div className="flex min-w-0 items-center gap-2">
 <XCircle className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
 <span className="truncate text-ink-400">{s.title}</span>
 </div>
 <span className="shrink-0 text-[10px] text-ink-400">
 M{s.milestone}·{s.order}
 </span>
 </li>
 ))}
 </ul>
 )
 }
 />
 )}
 </section>
 )}
 </>
 )}

 <div className="flex justify-end">
 <button
 onClick={() => navigate('/roadmap')}
 className="flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-primary-700 focus:outline-none"
 >
 View roadmap <ArrowRight className="h-4 w-4" aria-hidden="true" />
 </button>
 </div>
 </>
 )}
 </div>

 {/* Skip confirmation modal */}
 <Modal
 open={skipConfirm}
 onClose={() => setSkipConfirm(false)}
 tag="Skip step"
 title="Skip this step?"
 description={
 currentStep
 ?`"${currentStep.title}" will be recorded as skipped and your roadmap will adapt around it.`
 :'This step will be recorded as skipped and your roadmap will adapt.'
 }
 footer={
 <>
 <Button variant="ghost" onClick={() => setSkipConfirm(false)}>
 Keep it
 </Button>
 <Button
 variant="danger"
 onClick={confirmSkip}
 loading={acting ==='skip'}
 >
 <SkipForward className="h-4 w-4" aria-hidden="true" />
 Skip step
 </Button>
 </>
 }
 >
 {overview?.current_milestone_title && (
 <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-secondary p-3 text-xs text-ink-400">
 <Flag className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden="true" />
 Still within Milestone {String(currentStep?.milestone ??'').padStart(2,'0')} · {overview.current_milestone_title}
 </div>
 )}
 </Modal>

 <BadgeCelebration badge={celebration} onClose={() => setCelebration(null)} />
 </AppShell>
 )
}

function ContentCollapsed({ expanded, onToggle, label, viewLabel, tone, panel }) {
 const markerCls = tone ==='success' ?'text-success-600' :'text-ink-400'
 return (
 <div className="rounded-xl border border-line bg-surface shadow-soft">
 <button
 onClick={onToggle}
 className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left focus:outline-none"
 aria-expanded={expanded}
 >
 <span className="flex items-center gap-2 text-sm font-medium text-ink-300">
 <span className={markerCls}>✓</span>
 {label}
 </span>
 <span className="flex items-center gap-1 text-xs font-medium text-primary-600">
 {viewLabel}
 {expanded ? (
 <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
 ) : (
 <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
 )}
 </span>
 </button>
 <AnimatePresence initial={false}>
 {expanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.25, ease: EASE }}
 className="overflow-hidden"
 >
 <div className="border-t border-line px-5 py-1">{panel}</div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}
ContentCollapsed.propTypes = {
 expanded: PropTypes.bool.isRequired,
 onToggle: PropTypes.func.isRequired,
 label: PropTypes.string.isRequired,
 viewLabel: PropTypes.string.isRequired,
 tone: PropTypes.string,
 panel: PropTypes.node,
}
