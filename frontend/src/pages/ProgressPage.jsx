import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import {
  Activity, Target, Check, SkipForward, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, ExternalLink, Flame, ArrowRight,
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
import { useToast } from '../context/ToastContext'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function resourceButtonStyle(source) {
  switch (source) {
    case 'YouTube':
      return 'bg-red-600/15 border-red-500/30 text-red-400 hover:bg-red-600/25 hover:border-red-500/60'
    case 'GeeksforGeeks':
      return 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/25 hover:border-emerald-500/60'
    case 'W3Schools':
      return 'bg-blue-600/15 border-blue-500/30 text-blue-400 hover:bg-blue-600/25 hover:border-blue-500/60'
    default:
      return 'bg-surface-800/60 border-surface-700 text-surface-300 hover:bg-surface-700/60 hover:border-surface-600'
  }
}

function resourceIcon(source) {
  switch (source) {
    case 'YouTube': return '▶'
    case 'GeeksforGeeks': return 'GFG'
    case 'W3Schools': return 'W3'
    default: return '📄'
  }
}

function getStepResources(step) {
  if (step.resources && step.resources.length > 0) return step.resources
  const query = encodeURIComponent(step.title + ' tutorial')
  const gfg = step.title.toLowerCase().replace(/\s+/g, '-')
  return [
    { title: `Watch: ${step.title}`, type: 'youtube', url: `https://www.youtube.com/results?search_query=${query}`, source: 'YouTube' },
    { title: `Read: ${step.title}`, type: 'article', url: `https://www.geeksforgeeks.org/${gfg}/`, source: 'GeeksforGeeks' },
  ]
}

function WeeklyActivity({ streak }) {
  const slots = DAY_LABELS.map((day, i) => ({ day, active: streak?.weekly_activity?.[i]?.active ?? false }))
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {slots.map(({ day, active }) => (
        <div key={day} className="flex flex-col items-center gap-1">
          <div
            className={`h-6 w-6 rounded-[4px] border transition-all ${
              active ? 'border-primary-400/60 bg-primary-400/20' : 'border-surface-800 bg-surface-900'
            }`}
            title={day}
          >
            {active && (
              <div className="flex h-full items-center justify-center">
                <Flame className="h-3 w-3 text-primary-400" aria-hidden="true" />
              </div>
            )}
          </div>
          <span className="font-mono text-[8px] text-surface-600">{day[0]}</span>
        </div>
      ))}
    </div>
  )
}
WeeklyActivity.propTypes = { streak: PropTypes.object }

function HistorySection({ icon: Icon, title, count, steps, expanded, onToggle, accent }) {
  return (
    <div className="rounded-[8px] border border-surface-800 bg-surface-900/50">
      <button
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-900/80 ${accent || ''}`}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-surface-500" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-surface-400">{title}</span>
          <span className="rounded-[3px] border border-surface-700 bg-surface-900 px-1.5 py-0.5 font-mono text-[10px] text-surface-400">
            {count}
          </span>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-surface-500" /> : <ChevronRight className="h-4 w-4 text-surface-500" />}
      </button>
      {expanded && count > 0 && (
        <div className="border-t border-surface-800 px-5 py-3">
          <ul className="space-y-2">
            {steps.map((s) => (
              <li
                key={s.node_id}
                className="flex items-center justify-between gap-3 rounded-[6px] border border-surface-800 bg-surface-950/50 px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${s.status === 'skipped' ? 'text-surface-500' : 'text-emerald-400'}`} aria-hidden="true" />
                  <span className="truncate text-surface-200">{s.title}</span>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-surface-500">
                  M{s.milestone}·{s.order} · ~{s.estimated_hours}h
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {expanded && count === 0 && (
        <div className="border-t border-surface-800 px-5 py-3 font-mono text-[10px] text-surface-500">
          Nothing here yet.
        </div>
      )}
    </div>
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

export default function ProgressPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const activePathId = useGoalsStore((s) => s.activePathId)

  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [acting, setActing] = useState(null)
  const [historyOpen, setHistoryOpen] = useState({ completed: false, skipped: false })

  // Resolve the roadmap to load. Falls back to the first active roadmap when
  // the store has no explicit selection yet, so a fresh page mount (or a user
  // whose path was never marked "current") still loads their progress instead
  // of showing an empty/error state.
  const resolvePathId = useCallback((preferred) => {
    if (typeof preferred === 'string' && preferred) return preferred
    const store = useGoalsStore.getState()
    if (store.activePathId) return store.activePathId
    const firstActive = (store.goals || []).find((g) => g.status === 'active')
    return firstActive?.path_id || ''
  }, [])

  const load = useCallback(async (preferredPathId) => {
    const target = resolvePathId(preferredPathId || activePathId)
    if (!target) {
      setLoading(false)
      setError(null)
      setOverview(null)
      return
    }
    // Persist auto-selected roadmap so switching UI stays in sync.
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
  }, [activePathId, resolvePathId])

  // On mount, ensure goals are loaded, then load the (auto-resolved) roadmap.
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

  // Reload whenever the selected roadmap changes (roadmap switching).
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

  const handleSkip = async () => {
    const step = overview?.current_step
    if (!step || !activePathId) return
    setActing('skip')
    try {
      await api.skipStep(activePathId, step.node_id)
      toast.info('Step skipped.')
      await refreshAll()
    } catch {
      toast.error('Failed to skip step.')
    } finally {
      setActing(null)
    }
  }

  const toggleHistory = (key) =>
    setHistoryOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  if (!loading && !error && !activePathId) {
    return (
      <AppShell>
        <PageHeader
          tag="PATHFINDER / PROGRESS"
          icon={Activity}
          title="LEARNING PROGRESS"
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
                <Button onClick={() => navigate('/onboarding')} className="font-mono text-xs">
                  Create Learning Path
                </Button>
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
          tag="PATHFINDER / PROGRESS"
          icon={Activity}
          title="LEARNING PROGRESS"
          description="Advance through your roadmap one step at a time. Mark complete or skip to move the next step into focus."
        />

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} className="h-32" />)}
          </div>
        )}

        {error && <ErrorState title="Progress Unavailable" description={error} onRetry={() => load()} />}

        {!loading && !error && overview && (
          <>
            <RoadmapSwitcher />

            {/* Progress summary */}
            <div className="rounded-[8px] border border-primary-400/30 bg-primary-400/5 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-surface-500">ACTIVE ROADMAP</p>
                  <p className="truncate text-lg font-semibold text-white">{overview.role_label || '—'}</p>
                  <p className="mt-1 font-mono text-[11px] text-surface-400">
                    {Math.round((overview.overall_progress || 0) * 100)}% complete · {overview.completed_count} completed / {overview.total_steps} steps
                    {overview.skipped_count > 0 ? ` · ${overview.skipped_count} skipped` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-3xl font-bold text-primary-400">{progressPercent}%</p>
                    <p className="font-mono text-[10px] text-surface-500">
                      {overview.current_milestone_title || 'Current Milestone'}
                    </p>
                  </div>
                  {pathCompleted && (
                    <span className="flex items-center gap-1.5 rounded-[4px] border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> PATH COMPLETED
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-800">
                <div
                  className="h-full rounded-full bg-primary-400 transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {pathCompleted ? (
              <div className="rounded-[8px] border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
                <span className="text-4xl" role="img" aria-label="trophy">🏆</span>
                <h2 className="mt-3 text-xl font-semibold text-white">Path complete!</h2>
                <p className="mt-1 max-w-md mx-auto text-sm text-surface-400">
                  You&apos;ve finished the {overview.role_label} learning path. Great work — every step is accounted for.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <Button onClick={() => useGoalsStore.getState().fetchGoals() && undefined} className="font-mono text-xs">
                    Celebrate
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* CURRENT STEP */}
                {currentStep ? (
                  <div className="rounded-[8px] border border-primary-400/50 bg-surface-900/60 p-6 shadow-[0_0_24px_rgba(250,204,21,0.06)]">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                      <Target className="h-3.5 w-3.5" />
                      &gt; CURRENT STEP
                      <span className="rounded-[3px] bg-primary-400 px-1.5 py-0.5 font-mono text-[9px] font-bold text-black">
                        MILESTONE {String(currentStep.milestone).padStart(2, '0')} • STEP {currentStep.order}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-semibold text-white leading-snug">{currentStep.title}</h2>

                    {currentStep.description && (
                      <p className="mt-2 max-w-3xl text-sm text-surface-400 leading-relaxed">{currentStep.description}</p>
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
                    <div>
                      <p className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-wider text-surface-500">RESOURCES</p>
                      <div className="flex flex-wrap gap-2">
                        {resources.map((res) => (
                          <a
                            key={res.source + res.url}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 rounded-[6px] border px-3.5 py-2 text-xs font-medium transition-all ${resourceButtonStyle(res.source)}`}
                          >
                            <span className="font-mono text-xs">{resourceIcon(res.source)}</span>
                            {res.source === 'YouTube' ? 'Watch Video' : res.source === 'GeeksforGeeks' ? 'GeeksforGeeks' : res.source === 'W3Schools' ? 'W3Schools' : res.title}
                            <ExternalLink className="h-3 w-3 opacity-70" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex flex-col gap-3 border-t border-surface-800 pt-5 sm:flex-row">
                      <Button
                        onClick={handleComplete}
                        loading={acting === 'complete'}
                        className="flex-1 font-mono text-sm"
                        size="lg"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Mark as Complete
                      </Button>
                      <Button
                        onClick={handleSkip}
                        loading={acting === 'skip'}
                        variant="secondary"
                        className="flex-1 font-mono text-sm"
                        size="lg"
                      >
                        <SkipForward className="h-4 w-4" aria-hidden="true" />
                        Skip Step
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={Target}
                    title="No active step"
                    description="There is no current step available for this roadmap right now."
                  />
                )}

                {/* UP NEXT */}
                {upcoming.length > 0 && (
                  <div className="rounded-[8px] border border-surface-800 bg-surface-900/50 p-6">
                    <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
                      <ArrowRight className="h-3.5 w-3.5" />
                      &gt; UP NEXT
                    </div>
                    <ol className="space-y-2">
                      {upcoming.map((s, i) => (
                        <li
                          key={s.node_id}
                          className="flex items-center justify-between gap-3 rounded-[6px] border border-surface-800 bg-surface-950/50 px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-surface-700 bg-surface-900 font-mono text-[11px] font-medium text-surface-400">
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
                  </div>
                )}

                {/* Completed / skipped history (collapsed) */}
                {(completedCount > 0 || skippedCount > 0) && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <HistorySection
                      icon={CheckCircle2}
                      title="VIEW PREVIOUSLY COMPLETED"
                      count={completedCount}
                      steps={completedSteps}
                      expanded={historyOpen.completed}
                      onToggle={() => toggleHistory('completed')}
                      accent="hover:border-emerald-500/20"
                    />
                    <HistorySection
                      icon={XCircle}
                      title="VIEW SKIPPED MODULES"
                      count={skippedCount}
                      steps={skippedSteps}
                      expanded={historyOpen.skipped}
                      onToggle={() => toggleHistory('skipped')}
                      accent="hover:border-surface-700"
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
