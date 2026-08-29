import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Target, Check, SkipForward, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, ExternalLink, Flame, ArrowRight, Flag,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { SectionHeading } from '../components/shared/SectionHeading'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressBar, Ring } from '../components/ui/Progress'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { RoadmapSwitcher } from '../components/roles/RoadmapSwitcher'
import api from '../services/api'
import useGoalsStore from '../store/useGoalsStore'
import { useToast } from '../context/ToastContext'
import { resourceTone, resourceMark, getStepResources } from '../utils/resources'
import { EASE } from '../lib/motion'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function WeeklyActivity({ streak }) {
  const slots = DAY_LABELS.map((day, i) => ({ day, active: streak?.weekly_activity?.[i]?.active ?? false }))
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {slots.map(({ day, active }, i) => (
        <div key={day} className="flex flex-1 flex-col items-center gap-1">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.04, type: 'spring', stiffness: 400, damping: 24 }}
            className={`h-6 w-6 rounded-[5px] border transition-colors ${
              active ? 'border-primary-400/60 bg-primary-400/20' : 'border-surface-800 bg-surface-900'
            }`}
            title={day}
          >
            {active && (
              <div className="flex h-full items-center justify-center">
                <Flame className="h-3 w-3 text-primary-400" aria-hidden="true" />
              </div>
            )}
          </motion.div>
          <span className="font-mono text-[8px] text-surface-600">{day[0]}</span>
        </div>
      ))}
    </div>
  )
}
WeeklyActivity.propTypes = { streak: PropTypes.object }

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
}

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

  const resolvePathId = useCallback((preferred) => {
    if (typeof preferred === 'string' && preferred) return preferred
    const store = useGoalsStore.getState()
    if (store.activePathId) return store.activePathId
    const firstActive = (store.goals || []).find((g) => g.status === 'active')
    return firstActive?.path_id || ''
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
            ? 'This learning path is no longer available. Pick another roadmap to continue.'
            : 'Unable to load your progress. Please check connection and retry.'
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
      await api.completeStep(activePathId, step.node_id)
      toast.success(`${step.title} marked complete!`)
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
          description="Focus on your current learning step and move forward one at a time."
        />
        <div className="mt-8">
          <RoadmapSwitcher />
          <div className="mt-6">
            <EmptyState
              icon={Target}
              title="No learning roadmap yet"
              description="Create a learning path to start progressing through your roadmap."
              action={
                <Button onClick={() => navigate('/onboarding')}>Create Learning Path</Button>
              }
            />
          </div>
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
  const resources = getStepResources(currentStep || { title: '' })
  const pathCompleted = overview?.path_completed

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          tag="Progress"
          icon={Activity}
          title="Learning Progress"
          description="Advance through your roadmap one step at a time. Mark complete or skip to move the next step into focus."
        />

        {loading && (
          <div className="space-y-6">
            <div className="rounded-[12px] border border-surface-800 bg-surface-925 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-2.5 w-28" />
                  <Skeleton className="h-7 w-56" />
                  <Skeleton className="h-2.5 w-72" />
                </div>
                <Skeleton className="h-16 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-6 h-2.5 w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-[12px] border border-surface-800 bg-surface-925 p-5">
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
            <RoadmapSwitcher />

            {/* Progress summary */}
            <Card accent padded>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="section-label text-primary-400/80">Active Roadmap</p>
                  <p className="truncate text-lg font-semibold text-white">{overview.role_label || '—'}</p>
                  <p className="mt-1 font-mono text-[11px] text-surface-400">
                    {Math.round((overview.overall_progress || 0) * 100)}% complete · {overview.completed_count} completed / {overview.total_steps} steps
                    {overview.skipped_count > 0 ? ` · ${overview.skipped_count} skipped` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  {pathCompleted && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Path completed
                    </span>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="stat-number text-3xl font-bold text-primary-400">{progressPercent}%</p>
                    </div>
                    <Ring value={progressPercent} max={100} size={44} stroke={4}>
                      <span className="text-[9px] font-semibold text-surface-300">{overview.current_milestone_number || 'M'}</span>
                    </Ring>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={progressPercent} max={100} tone="gold" className="h-2" />
              </div>
            </Card>

            {pathCompleted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <Card className="border-emerald-500/40 bg-emerald-500/[0.04] p-10 text-center">
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-3xl"
                    role="img"
                    aria-label="trophy"
                  >
                    🏆
                  </motion.span>
                  <h2 className="mt-4 text-xl font-semibold text-white">Path complete!</h2>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-surface-400">
                    You&apos;ve finished the {overview.role_label} learning path. Great work — every step is accounted for.
                  </p>
                  <div className="mt-5 flex justify-center gap-3">
                    <Button onClick={() => navigate('/roadmap')} variant="outline">
                      <Flag className="h-4 w-4" aria-hidden="true" />
                      View Journey
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <>
                {/* CURRENT STEP */}
                <AnimatePresence mode="wait">
                  {currentStep ? (
                    <motion.div
                      key={currentStep.node_id}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <Card
                        raised
                        padded
                        className="relative border-primary-400/40"
                      >
                        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary-400/60 to-transparent" aria-hidden="true" />
                        <div className="flex flex-wrap items-center gap-2">
                          <SectionHeading prefix=">" icon={Target}>
                            Current Step
                          </SectionHeading>
                          <span className="badge-line bg-primary-400/10 font-mono text-[10px] text-primary-300">
                            Milestone {String(currentStep.milestone).padStart(2, '0')} · Step {currentStep.order}
                          </span>
                        </div>

                        <h2 className="mt-4 text-xl font-semibold leading-snug text-white">
                          {currentStep.title}
                        </h2>

                        {currentStep.description && (
                          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-surface-400">
                            {currentStep.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[11px] text-surface-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> {currentStep.estimated_hours || '?'} hours estimated
                          </span>
                          {overview.current_milestone_title && (
                            <span className="flex items-center gap-1 text-surface-500">
                              <Flame className="h-3 w-3" /> {overview.current_milestone_title}
                            </span>
                          )}
                        </div>

                        {/* Resources */}
                        <div className="mt-5">
                          <p className="section-label mb-2 text-surface-500">Resources</p>
                          <div className="flex flex-wrap gap-2">
                            {resources.map((res) => (
                              <a
                                key={res.source + res.url}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-2 rounded-[8px] border px-3.5 py-2 text-xs font-medium transition-all ${resourceTone(res.source)}`}
                              >
                                <span className="font-mono text-xs">{resourceMark(res.source).glyph}</span>
                                {res.source === 'YouTube'
                                  ? 'Watch Video'
                                  : res.source === 'GeeksforGeeks'
                                    ? 'GeeksforGeeks'
                                    : res.source === 'W3Schools'
                                      ? 'W3Schools'
                                      : res.title}
                                <ExternalLink className="h-3 w-3 opacity-70" />
                              </a>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex flex-col gap-3 border-t border-surface-800 pt-5 sm:flex-row">
                          <Button
                            onClick={handleComplete}
                            loading={acting === 'complete'}
                            className="flex-1 text-sm"
                            size="lg"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Mark as Complete
                          </Button>
                          <Button
                            onClick={() => setSkipConfirm(true)}
                            loading={acting === 'skip'}
                            variant="secondary"
                            className="flex-1 text-sm"
                            size="lg"
                          >
                            <SkipForward className="h-4 w-4" aria-hidden="true" />
                            Skip Step
                          </Button>
                        </div>
                      </Card>
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
                  <Card padded>
                    <SectionHeading icon={ArrowRight} trailing={<span className="section-label text-surface-600">{upcoming.length} steps ahead</span>}>
                      Up Next
                    </SectionHeading>
                    <ol className="mt-4 space-y-2.5">
                      {upcoming.map((s, i) => (
                        <li
                          key={s.node_id}
                          className="group flex items-center justify-between gap-3 rounded-[10px] border border-surface-800 bg-surface-950/50 px-4 py-3 transition-all hover:border-surface-700 hover:bg-surface-900/70"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-surface-700 bg-surface-900 font-mono text-[11px] font-medium text-surface-400 transition-colors group-hover:border-primary-400/40 group-hover:text-primary-400">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-surface-100">{s.title}</p>
                              <p className="mt-0.5 font-mono text-[10px] text-surface-500">
                                Milestone {s.milestone} · Step {s.order}
                              </p>
                            </div>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-surface-400">
                            <Clock className="h-3 w-3" /> {s.estimated_hours || '?'}h
                          </span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}

                {/* Completed / skipped history (collapsed) */}
                {(completedCount > 0 || skippedCount > 0) && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <HistorySection
                      icon={CheckCircle2}
                      title="Previously completed"
                      count={completedCount}
                      steps={completedSteps}
                      expanded={historyOpen.completed}
                      onToggle={() => toggleHistory('completed')}
                      accent="hover:bg-emerald-500/[0.04]"
                    />
                    <HistorySection
                      icon={XCircle}
                      title="Skipped modules"
                      count={skippedCount}
                      steps={skippedSteps}
                      expanded={historyOpen.skipped}
                      onToggle={() => toggleHistory('skipped')}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Skip confirmation modal */}
      <Modal
        open={skipConfirm}
        onClose={() => setSkipConfirm(false)}
        tag="Pathfinder"
        title="Skip this step?"
        description={
          currentStep
            ? `"${currentStep.title}" will be recorded as skipped and your roadmap will adapt. You can also leave it — no one is watching.`
            : 'This step will be recorded as skipped and your roadmap will adapt.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setSkipConfirm(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={confirmSkip}
              loading={acting === 'skip'}
            >
              <SkipForward className="h-4 w-4" aria-hidden="true" />
              Skip step
            </Button>
          </>
        }
      >
        {overview?.current_milestone_title && (
          <div className="flex items-center gap-2 rounded-[8px] border border-surface-800 bg-surface-950/60 p-3 text-xs text-surface-400">
            <Flag className="h-3.5 w-3.5 shrink-0 text-primary-400" aria-hidden="true" />
            Still within Milestone {String(currentStep?.milestone ?? '').padStart(2, '0')} · {overview.current_milestone_title}
          </div>
        )}
      </Modal>
    </AppShell>
  )
}

function HistorySection({ icon: Icon, title, count, steps, expanded, onToggle, accent }) {
  return (
    <Card className={accent}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left focus:outline-none"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-surface-500" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-surface-400">{title}</span>
          <span className="rounded-full border border-surface-700 bg-surface-900 px-1.5 py-0.5 font-mono text-[10px] text-surface-400">
            {count}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-surface-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-surface-500" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            {count > 0 ? (
              <ul className="space-y-1.5 border-t border-surface-800 px-5 py-3">
                {steps.map((s) => (
                  <li
                    key={s.node_id}
                    className="flex items-center justify-between gap-3 rounded-[8px] border border-surface-800 bg-surface-950/50 px-3 py-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${s.status === 'skipped' ? 'text-surface-500' : 'text-emerald-400'}`}
                        aria-hidden="true"
                      />
                      <span className="truncate text-surface-200">{s.title}</span>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-surface-500">
                      M{s.milestone}·{s.order} · ~{s.estimated_hours}h
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-t border-surface-800 px-5 py-3 font-mono text-[10px] text-surface-500">
                Nothing here yet.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

HistorySection.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  steps: PropTypes.array.isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  accent: PropTypes.string,
}