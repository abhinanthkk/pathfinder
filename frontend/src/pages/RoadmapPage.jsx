import { useState, useEffect, useCallback, useMemo } from'react'
import { useNavigate } from'react-router-dom'
import { motion, AnimatePresence } from'framer-motion'
import PropTypes from'prop-types'
import {
 Map, RefreshCw, Clock, Check, X, Play, SkipForward,
 Sparkles, ChevronRight, ExternalLink, Lock, Trophy,
} from'lucide-react'
import { AppShell } from'../components/layout/AppShell'
import { PageHeader } from'../components/shared/PageHeader'
import { Button } from'../components/ui/Button'
import { Modal } from'../components/ui/Modal'
import { Skeleton } from'../components/ui/Skeleton'
import { ErrorState } from'../components/ui/ErrorState'
import { EmptyState } from'../components/ui/EmptyState'
import { ResourceIcon } from'../components/shared/ResourceIcon'
import useUserStore from'../store/useUserStore'
import usePathStore from'../store/usePathStore'
import useGoalsStore from'../store/useGoalsStore'
import { useToast } from'../context/ToastContext'
import api from'../services/api'
import { skillLabel } from'../utils/labels'
import { computeSummary, milestoneIsCompleted, milestoneIsCurrent } from'../utils/roadmapLayout'
import { resourceTone, getStepResources } from'../utils/resources'
import { EASE } from'../lib/motion'

const MILESTONE_ACCENTS = [
 { number: 1, ring:'border-primary-300 bg-primary-50 text-primary-700', bar:'from-primary-500 to-primary-400', label:'text-primary-700' },
 { number: 2, ring:'border-streak-300 bg-streak-50 text-streak-600', bar:'from-streak-500 to-warning-400', label:'text-streak-600' },
 { number: 3, ring:'border-badge-300 bg-badge-50 text-badge-600', bar:'from-badge-500 to-primary-400', label:'text-badge-600' },
 { number: 4, ring:'border-streak-300 bg-streak-50 text-streak-600', bar:'from-streak-500 to-warning-400', label:'text-streak-600' },
]

const STATUS_META = {
 completed: {
 titleCls:'text-ink-400 line-through decoration-success-400/50',
 ringCls:'border-success-200 bg-success-50 text-success-600',
 badgeCls:'border-success-200 bg-success-50 text-success-700',
 badgeText:'Completed',
 },
 in_progress: {
 titleCls:'text-ink',
 ringCls:'border-primary-300 bg-primary-50 text-primary-700',
 badgeCls:'border-primary-200 bg-primary-50 text-primary-700',
 badgeText:'In progress',
 },
 available: {
 titleCls:'text-ink-300',
 ringCls:'border-line-strong bg-surface text-ink-400',
 badgeCls:'border-line bg-surface-secondary text-ink-400',
 badgeText:'Ready',
 },
 locked: {
 titleCls:'text-ink-500',
 ringCls:'border-line bg-surface-secondary text-ink-500',
 badgeCls:'border-line bg-surface-secondary text-ink-500',
 badgeText:'Locked',
 },
 skipped: {
 titleCls:'text-ink-500 line-through decoration-ink-400/40',
 ringCls:'border-line bg-surface-secondary text-ink-400',
 badgeCls:'border-line bg-surface-secondary text-ink-400',
 badgeText:'Skipped',
 },
}

function accentFor(milestoneNumber) {
 return MILESTONE_ACCENTS.find((a) => a.number === milestoneNumber) || MILESTONE_ACCENTS[0]
}

function StepRow({ step, milestoneNumber, onClick }) {
 const isCompleted = step.status ==='completed'
 const isSkipped = step.status ==='skipped'
 const isCurrent = step.status ==='in_progress'
 const isLocked = step.status ==='locked'
 const meta = STATUS_META[step.status] || STATUS_META.available

 return (
 <li className="relative">
 <button
 onClick={() => onClick(step)}
 className="group flex w-full items-center gap-3.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-all duration-150 hover:border-line hover:bg-surface-secondary focus:outline-none"
 aria-label={`Inspect: ${step.title}`}
 >
 <span
 className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${meta.ringCls}`}
 aria-hidden="true"
 >
 {isCompleted ? (
 <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
 ) : isSkipped ? (
 <SkipForward className="h-3 w-3" />
 ) : isCurrent ? (
 <Play className="h-2.5 w-2.5 fill-current" />
 ) : isLocked ? (
 <Lock className="h-3 w-3" />
 ) : (
 <span className="text-[10px] font-semibold">{step.order}</span>
 )}
 </span>

 <span className="min-w-0 flex-1">
 <span className={`block truncate text-sm font-medium ${meta.titleCls}`}>
 {step.title}
 </span>
 <span className="mt-0.5 flex items-center gap-2 text-[10px] text-ink-400">
 <span>
 M{milestoneNumber} · Step {step.order}
 </span>
 {step.estimated_hours ? (
 <>
 <span aria-hidden="true">·</span>
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3" /> {step.estimated_hours}h
 </span>
 </>
 ) : null}
 </span>
 </span>

 <ChevronRight
 className="h-4 w-4 shrink-0 text-ink-400 transition-colors group-hover:text-ink"
 aria-hidden="true"
 />
 </button>
 </li>
 )
}
StepRow.propTypes = {
 step: PropTypes.object.isRequired,
 milestoneNumber: PropTypes.number.isRequired,
 onClick: PropTypes.func.isRequired,
}

function MilestoneBlock({ milestone, summary, collapsed, onToggle, onStepClick }) {
 const nodes = milestone?.nodes || []
 const doneCount = nodes.filter((n) => n.status ==='completed' || n.status ==='skipped').length
 const pct = nodes.length ? Math.round((doneCount / nodes.length) * 100) : 0
 const isCompleted = milestoneIsCompleted(milestone)
 const isCurrent = milestoneIsCurrent(summary, milestone)
 const accent = accentFor(milestone.number)

 return (
 <section className="relative">
 <div
 className={`rounded-xl border bg-surface shadow-card transition-colors ${
 isCurrent ?'border-primary-200' :'border-line'
 }`}
 >
 <button
 onClick={onToggle}
 className="flex w-full items-start gap-4 px-5 py-4 text-left focus:outline-none sm:items-center"
 aria-expanded={!collapsed}
 >
 <span
 className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
 isCompleted
 ?'border-success-200 bg-success-50 text-success-600'
 : isCurrent
 ?'border-primary-300 bg-primary-50 text-primary-700 shadow-emphasis'
 : accent.ring
 }`}
 aria-hidden="true"
 >
 {isCompleted ? <Check className="h-4 w-4" strokeWidth={2.5} /> : String(milestone.number).padStart(2,'0')}
 </span>

 <span className="min-w-0 flex-1">
 <span className="flex flex-wrap items-center gap-2">
 <span className="section-label text-ink-400">
 Milestone {String(milestone.number).padStart(2,'0')}
 </span>
 {isCurrent && !isCompleted && (
 <span className="flex items-center gap-1 rounded-full bg-primary-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-700">
 <span className="relative flex h-1.5 w-1.5">
 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-600 opacity-60" aria-hidden="true" />
 <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-600" aria-hidden="true" />
 </span>
 Current
 </span>
 )}
 {isCompleted && (
 <span className="rounded-full bg-success-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-success-700">
 Complete
 </span>
 )}
 </span>
 <span className={`mt-1 block truncate text-base font-semibold sm:text-lg ${isCompleted ?'text-ink-400' :'text-ink'}`}>
 {milestone.title}
 </span>
 <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-400">
 <span>
 {doneCount}/{nodes.length} steps
 </span>
 {milestone.estimated_hours ? <span>~{Math.round(milestone.estimated_hours)}h</span> : null}
 {milestone.estimated_weeks ? <span>~{milestone.estimated_weeks}wks</span> : null}
 </span>
 </span>

 <ChevronRight
 className={`mt-1 h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200 sm:mt-0 ${collapsed ?'' :'rotate-90'}`}
 aria-hidden="true"
 />
 </button>

 {!collapsed && (
 <div className="border-t border-line px-3 pb-3 pt-1 sm:px-4">
 <div className="mb-1 h-1 w-full overflow-hidden rounded-full bg-line/60">
 <div
 className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
 isCompleted ?'from-success-500 to-success-400' : accent.bar
 }`}
 style={{ width:`${pct}%` }}
 aria-hidden="true"
 />
 </div>
 <span className="mb-2 block pr-1 text-right text-[10px] font-medium text-ink-400">
 {pct}%
 </span>
 <AnimatePresence initial={false}>
 <motion.ul
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.25, ease: EASE }}
 className="overflow-hidden"
 >
 {nodes.map((n) => (
 <StepRow key={n.node_id} step={n} milestoneNumber={milestone.number} onClick={onStepClick} />
 ))}
 </motion.ul>
 </AnimatePresence>
 </div>
 )}
 </div>
 </section>
 )
}
MilestoneBlock.propTypes = {
 milestone: PropTypes.object.isRequired,
 summary: PropTypes.object.isRequired,
 collapsed: PropTypes.bool.isRequired,
 onToggle: PropTypes.func.isRequired,
 onStepClick: PropTypes.func.isRequired,
}

function SummaryStrip({ summary }) {
 const stats = [
 { label:'Overall progress', value:`${summary.progress}%`, note:`${summary.completedSteps}/${summary.totalSteps} steps` },
 { label:'Steps remaining', value: String(Math.max(0, summary.totalSteps - summary.completedSteps - (summary.skippedSteps || 0))), note:`${summary.totalHours || 0}h of effort` },
 { label:'Estimated completion', value: summary.estimatedCompletion, note:'based on your pace' },
 { label:'Active milestone', value: summary.currentMilestoneNumber, note: summary.currentMilestone },
 ]
 return (
 <div className="flex flex-wrap items-stretch gap-x-0 rounded-xl border border-line bg-surface shadow-card">
 {stats.map((s, i) => (
 <div
 key={s.label}
 className={`flex-1 basis-1/2 px-5 py-4 sm:basis-0 ${i > 0 ?'sm:border-l sm:border-line' :''} ${s.label ==='Overall progress' ?'' :'hidden lg:block'}`}
 >
 <p className="text-[11px] font-medium text-ink-400">{s.label}</p>
 <p className="mt-1 truncate text-lg font-semibold text-ink">{s.value}</p>
 <p className="mt-0.5 truncate text-xs text-ink-400">{s.note}</p>
 </div>
 ))}
 </div>
 )
}
SummaryStrip.propTypes = { summary: PropTypes.object.isRequired }

function StepDrawer({
 step, milestone, onClose, onComplete, onSkip, acting,
}) {
 const isCompleted = step.status ==='completed'
 const isSkipped = step.status ==='skipped'
 const resources = getStepResources(step)
 const skills = Array.isArray(step.skills) ? step.skills.slice(0, 6) : []
 const meta = STATUS_META[step.status] || STATUS_META.available

 return (
 <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Step: ${step.title}`}>
 <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
 <motion.div
 initial={{ x:'100%' }}
 animate={{ x: 0 }}
 exit={{ x:'100%' }}
 transition={{ duration: 0.32, ease: EASE }}
 className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface shadow-panel"
 >
 <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-surface/95 px-6 py-5 backdrop-blur">
 <div className="min-w-0">
 <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-600">
 Milestone {String(milestone?.number ?? step.milestone).padStart(2,'0')} · Step {step.order}
 </p>
 <h2 className="mt-1 text-lg font-semibold leading-snug text-ink">{step.title}</h2>
 </div>
 <button
 onClick={onClose}
 className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-400 transition-colors hover:border-line hover:text-ink"
 aria-label="Close step details"
 >
 <X className="h-4 w-4" aria-hidden="true" />
 </button>
 </div>

 <div className="flex-1 space-y-6 px-6 py-5">
 <div className="flex flex-wrap items-center gap-2">
 <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${meta.badgeCls}`}>
 {meta.badgeText}
 </span>
 {step.estimated_hours ? (
 <span className="flex items-center gap-1 rounded-full border border-line bg-surface-secondary px-2.5 py-0.5 text-[10px] font-medium text-ink-400">
 <Clock className="h-3 w-3" /> {step.estimated_hours} hours
 </span>
 ) : null}
 {milestone?.title ? (
 <span className="truncate text-[10px] text-ink-400">{milestone.title}</span>
 ) : null}
 </div>

 {step.description && (
 <div>
 <p className="text-[11px] font-medium text-ink-400">About this step</p>
 <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{step.description}</p>
 </div>
 )}

 {skills.length > 0 && (
 <div>
 <p className="text-[11px] font-medium text-ink-400">Skills it builds</p>
 <div className="mt-2 flex flex-wrap gap-1.5">
 {skills.map((s) => (
 <span
 key={s}
 className="rounded-md border border-line bg-surface-secondary px-2 py-1 text-[10px] font-medium text-ink-300"
 >
 {skillLabel(s)}
 </span>
 ))}
 </div>
 </div>
 )}

 {resources.length > 0 && (
 <div>
 <p className="text-[11px] font-medium text-ink-400">Recommended resources</p>
 <div className="mt-2 space-y-1.5">
 {resources.map((res) => (
 <a
 key={res.source + (res.url || res.title)}
 href={res.url}
 target="_blank"
 rel="noopener noreferrer"
 className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 ${resourceTone(res.source)}`}
 >
 <span className="flex min-w-0 items-center gap-2.5">
 <ResourceIcon source={res.source} className="h-7 w-7" />
 <span className="truncate">{res.title}</span>
 </span>
 <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
 </a>
 ))}
 </div>
 </div>
 )}
 </div>

 <div className="sticky bottom-0 border-t border-line bg-surface/95 px-6 py-4 backdrop-blur">
 {isCompleted ? (
 <p className="flex items-center gap-2 py-2 text-sm font-medium text-success-700">
 <Check className="h-4 w-4" strokeWidth={2.5} /> This step is complete
 </p>
 ) : isSkipped ? (
 <p className="py-2 text-sm font-medium text-ink-400">
 Skipped — this step was bypassed on your path.
 </p>
 ) : (
 <div className="flex flex-col gap-2">
 <Button onClick={() => onComplete(step)} loading={acting ==='complete'} className="w-full">
 <Check className="h-4 w-4" aria-hidden="true" />
 Mark as complete
 </Button>
 {step.status !=='locked' && (
 <Button onClick={() => onSkip(step)} variant="secondary" loading={acting ==='skip'} className="w-full">
 <SkipForward className="h-4 w-4" aria-hidden="true" />
 Skip step
 </Button>
 )}
 {step.status ==='locked' && (
 <p className="text-center text-xs text-ink-400">
 Locked until previous steps are complete.
 </p>
 )}
 </div>
 )}
 </div>
 </motion.div>
 </div>
 )
}
StepDrawer.propTypes = {
 step: PropTypes.object.isRequired,
 milestone: PropTypes.object,
 onClose: PropTypes.func.isRequired,
 onComplete: PropTypes.func.isRequired,
 onSkip: PropTypes.func.isRequired,
 acting: PropTypes.string,
}

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
 className="flex h-16 w-16 items-center justify-center rounded-2xl border border-badge-200 bg-gradient-to-br from-badge-500/15 to-primary-500/15 text-3xl shadow-card"
 role="img"
 aria-label="badge"
 >
 {badge?.icon ||'🏅'}
 </motion.span>
 <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary-700">
 <Trophy className="h-4 w-4" aria-hidden="true" />
 You earned a new badge
 </p>
 </div>
 </Modal>
 )
}
BadgeCelebration.propTypes = { badge: PropTypes.object, onClose: PropTypes.func.isRequired }

export default function RoadmapPage() {
 const navigate = useNavigate()
 const toast = useToast()
 const { profile } = useUserStore()
 const { path, setPath } = usePathStore()
 const activePathId = useGoalsStore((s) => s.activePathId)

 const [loading, setLoading] = useState(false)
 const [loadError, setLoadError] = useState(false)
 const [regenerating, setRegenerating] = useState(false)
 const [selectedStep, setSelectedStep] = useState(null)
 const [collapsedMilestones, setCollapsedMilestones] = useState([])
 const [acting, setActing] = useState(null)
 const [celebration, setCelebration] = useState(null)
 const [skipConfirm, setSkipConfirm] = useState(false)

 const loadPath = useCallback(
 async (pathId) => {
 setLoading(true)
 setLoadError(false)
 try {
 const data = await api.getPath(pathId || undefined)
 setPath(data)
 } catch (err) {
 console.error('Roadmap load failed:', err?.response?.status, err?.message)
 setLoadError(true)
 if (err?.response?.status !== 404) toast.error('Unable to fetch learning roadmap.')
 } finally {
 setLoading(false)
 }
 },
 [setPath, toast]
 )

 const boot = useCallback(async () => {
 if (useGoalsStore.getState().goals.length === 0) {
 await useGoalsStore.getState().fetchGoals()
 }
 }, [])

 useEffect(() => {
 boot()
 }, [boot])

 useEffect(() => {
 if (!activePathId) return
 setSelectedStep(null)
 loadPath(activePathId)
 }, [activePathId, loadPath])

 const refreshGoals = useCallback(() => {
 useGoalsStore.getState().fetchGoals()
 }, [])

 const handleRegenerate = useCallback(async () => {
 setRegenerating(true)
 try {
 const data = await api.generatePath()
 setPath(data)
 toast.success('Learning roadmap recalculated.')
 } catch {
 toast.error('Failed to recalculate roadmap.')
 } finally {
 setRegenerating(false)
 }
 }, [setPath, toast])

 const handleComplete = useCallback(
 async (step) => {
 if (!activePathId || !step) return
 setActing('complete')
 try {
 const res = await api.completeStep(activePathId, step.node_id)
 toast.success(`"${step.title}" marked complete!`)
 if (res?.milestone_completed) {
 toast.success(`Milestone ${res.milestone_completed} complete — nice momentum.`)
 }
 if (res?.new_badges?.length) setCelebration(res.new_badges[0])
 setSelectedStep(null)
 refreshGoals()
 loadPath(activePathId)
 } catch {
 toast.error('Failed to update step progress.')
 } finally {
 setActing(null)
 }
 },
 [activePathId, toast, loadPath, refreshGoals]
 )

 const handleSkip = useCallback(
 async (step) => {
 if (!activePathId || !step) return
 setActing('skip')
 setSkipConfirm(false)
 try {
 await api.skipStep(activePathId, step.node_id)
 toast.info('Step skipped. Your roadmap adapts around it.')
 setSelectedStep(null)
 refreshGoals()
 loadPath(activePathId)
 } catch {
 toast.error('Failed to skip step.')
 } finally {
 setActing(null)
 }
 },
 [activePathId, toast, loadPath, refreshGoals]
 )

 const toggleMilestone = useCallback((number) => {
 setCollapsedMilestones((prev) =>
 prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number]
 )
 }, [])

 const openStep = useCallback((step) => {
 setSelectedStep(step)
 }, [])

 const milestoneFor = useCallback(
 (step) => (path?.milestones || []).find((m) => m.number === step.milestone) || null,
 [path]
 )

 const summary = useMemo(() => computeSummary(path, profile), [path, profile])
 const milestones = (path?.milestones || []).filter((m) => m && Array.isArray(m.nodes))
 const activeGoal = useGoalsStore((s) => s.goals.find((g) => g.path_id === s.activePathId))
 const roleLabel = activeGoal?.role_label || (profile?.target_role ||'').replace(/_/g,'') ||'Engineering'

 if (!loading && !loadError && milestones.length === 0 && path === null) {
 return (
 <AppShell>
 <div className="space-y-8">
 <PageHeader
 tag="Journey"
 icon={Map}
 title="Learning Roadmap"
 description="A milestone-driven path built from your profile. Start one to see it here."
 />
 <EmptyState
 icon={Map}
 title="No roadmap yet"
 description="Create a learning path to unlock your personalized journey."
 action={<Button onClick={() => navigate('/onboarding')}>Create learning path</Button>}
 />
 </div>
 </AppShell>
 )
 }

 const selectedMilestone = selectedStep ? milestoneFor(selectedStep) : null

 return (
 <AppShell>
 <div className="space-y-8">
 <PageHeader
 tag={`Journey / ${roleLabel}`}
 icon={Map}
 title="Learning Roadmap"
 description="Your personalized, milestone-driven path. Select any step to inspect it, mark it complete, or skip it."
 actions={
 <div className="flex items-center gap-2">
 <Button
 variant="secondary"
 onClick={handleRegenerate}
 loading={regenerating}
 disabled={loading || milestones.length === 0}
 >
 <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
 Recalculate
 </Button>
 </div>
 }
 />

 {loading && !path && (
 <div className="space-y-4">
 <Skeleton className="h-24 w-full rounded-xl" />
 <Skeleton className="h-72 w-full rounded-xl" />
 <Skeleton className="h-72 w-full rounded-xl" />
 </div>
 )}

 {loadError && !loading && (
 <ErrorState
 title="Unable to load roadmap"
 description="We could not retrieve this learning path. Check your connection and try again."
 onRetry={() => loadPath(activePathId || undefined)}
 />
 )}

 {!loading && !loadError && milestones.length > 0 && (
 <>
 <SummaryStrip summary={summary} />

 <div className="relative">
 <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-primary-400/40 via-primary-200/30 to-transparent" aria-hidden="true" />
 <div className="space-y-4 pl-7">
 {milestones.map((m) => (
 <MilestoneBlock
 key={m.number}
 milestone={m}
 summary={summary}
 collapsed={collapsedMilestones.includes(m.number)}
 onToggle={() => toggleMilestone(m.number)}
 onStepClick={openStep}
 />
 ))}
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-ink-400">
 <span className="flex items-center gap-1.5">
 <span className="h-2 w-2 rounded-full bg-primary-600" aria-hidden="true" /> Current
 </span>
 <span className="flex items-center gap-1.5">
 <span className="h-2 w-2 rounded-full bg-success-500" aria-hidden="true" /> Completed
 </span>
 <span className="flex items-center gap-1.5">
 <span className="h-2 w-2 rounded-full bg-line-strong" aria-hidden="true" /> Locked
 </span>
 <span className="flex items-center gap-1.5">
 <span className="h-2 w-2 rounded-full bg-ink-400/40" aria-hidden="true" /> Skipped
 </span>
 </div>
 </>
 )}
 </div>

 <AnimatePresence>
 {selectedStep && (
 <StepDrawer
 step={selectedStep}
 milestone={selectedMilestone}
 onClose={() => setSelectedStep(null)}
 onComplete={handleComplete}
 onSkip={() => setSkipConfirm(true)}
 acting={acting}
 />
 )}
 </AnimatePresence>

 <Modal
 open={skipConfirm}
 onClose={() => setSkipConfirm(false)}
 tag="Skip step"
 title="Skip this step?"
 description={
 selectedStep
 ?`"${selectedStep.title}" will be recorded as skipped and your roadmap will adapt around it.`
 :'This step will be recorded as skipped.'
 }
 footer={
 <>
 <Button variant="ghost" onClick={() => setSkipConfirm(false)}>
 Keep it
 </Button>
 <Button variant="danger" onClick={() => handleSkip(selectedStep)} loading={acting ==='skip'}>
 <SkipForward className="h-4 w-4" aria-hidden="true" />
 Skip step
 </Button>
 </>
 }
 >
 {selectedMilestone?.title && (
 <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-secondary p-3 text-xs text-ink-400">
 <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden="true" />
 Within Milestone {String(selectedMilestone.number).padStart(2,'0')} · {selectedMilestone.title}
 </div>
 )}
 </Modal>

 <BadgeCelebration badge={celebration} onClose={() => setCelebration(null)} />
 </AppShell>
 )
}
