import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import {
  Map, RefreshCw, Target, Clock, Check, Lock, SkipForward,
  Play, ChevronDown, ChevronRight, X, Lightbulb, ExternalLink,
  BookOpen, CheckCircle2,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import useUserStore from '../store/useUserStore'
import usePathStore from '../store/usePathStore'
import useGoalsStore from '../store/useGoalsStore'
import { useToast } from '../context/ToastContext'
import { RoadmapSwitcher } from '../components/roles/RoadmapSwitcher'
import api from '../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFallbackResources(title) {
  const query = encodeURIComponent(title + ' tutorial')
  const gfgQuery = title.toLowerCase().replace(/\s+/g, '-')
  return [
    {
      title: `Watch: ${title}`,
      type: 'youtube',
      url: `https://www.youtube.com/results?search_query=${query}`,
      source: 'YouTube',
    },
    {
      title: 'Read on GeeksforGeeks',
      type: 'article',
      url: `https://www.geeksforgeeks.org/${gfgQuery}/`,
      source: 'GeeksforGeeks',
    },
  ]
}

function getStepResources(step) {
  if (step.resources && step.resources.length > 0) return step.resources
  return getFallbackResources(step.title)
}

function statusMeta(status) {
  switch (status) {
    case 'completed':
      return { icon: CheckCircle2, label: 'COMPLETED', color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-500/5' }
    case 'in_progress':
    case 'current':
      return { icon: Play, label: 'YOU ARE HERE', color: 'text-primary-400', border: 'border-primary-400', bg: 'bg-primary-400/5' }
    case 'skipped':
      return { icon: SkipForward, label: 'SKIPPED', color: 'text-surface-500', border: 'border-surface-700', bg: 'bg-surface-950/60' }
    case 'locked':
      return { icon: Lock, label: 'LOCKED', color: 'text-surface-600', border: 'border-surface-800', bg: 'bg-surface-950/40' }
    default:
      return { icon: ChevronRight, label: 'NEXT', color: 'text-surface-300', border: 'border-surface-700', bg: 'bg-surface-900/50' }
  }
}

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
    case 'YouTube':
      return '▶'
    case 'GeeksforGeeks':
      return 'GFG'
    case 'W3Schools':
      return 'W3'
    default:
      return '📄'
  }
}

// ─── Vertical Arrow ────────────────────────────────────────────────────────────

function Arrow() {
  return (
    <div className="flex justify-center">
      <div className="w-0.5 h-6 bg-surface-700" />
    </div>
  )
}

// ─── Step Node ─────────────────────────────────────────────────────────────────

function StepNode({ step, onClick }) {
  const meta = statusMeta(step.status)
  const Icon = meta.icon
  const isLocked = step.status === 'locked'
  const isSkipped = step.status === 'skipped'
  const resources = getStepResources(step)

  return (
    <button
      onClick={() => !isLocked && onClick(step)}
      disabled={isLocked}
      className={`w-full text-left rounded-[8px] border px-4 py-3.5 transition-all ${meta.border} ${meta.bg} ${
        isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'
      } ${isSkipped ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Status label */}
          <div className={`flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wider ${meta.color}`}>
            <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{meta.label}</span>
            {step.status === 'in_progress' || step.status === 'current' ? (
              <span className="ml-1 rounded-[3px] bg-primary-400 px-1 py-0.5 font-mono text-[9px] text-black font-bold">
                ACTIVE
              </span>
            ) : null}
          </div>

          {/* Title */}
          <h3
            className={`mt-1 text-sm font-semibold leading-snug ${
              isSkipped ? 'line-through text-surface-500' : 'text-white'
            }`}
          >
            {step.title}
          </h3>
        </div>

        {/* Hours */}
        <div className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-surface-500">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{step.estimated_hours || '?'}h</span>
        </div>
      </div>

      {/* Resource quick icons */}
      {!isLocked && resources.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {resources.slice(0, 3).map((res) => (
            <a
              key={res.source + res.url}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 font-mono text-[10px] transition-all ${resourceButtonStyle(res.source)}`}
              title={res.title}
            >
              <span>{resourceIcon(res.source)}</span>
              <span>{res.source}</span>
            </a>
          ))}
        </div>
      )}
    </button>
  )
}
StepNode.propTypes = {
  step: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
}

// ─── Milestone Header ──────────────────────────────────────────────────────────

function MilestoneHeader({ milestone, steps, collapsed, onToggle }) {
  const total = steps.length
  const completed = steps.filter((s) => s.status === 'completed').length
  const allDone = completed === total && total > 0
  const isCurrent = steps.some(
    (s) => s.status === 'in_progress' || s.status === 'current'
  )

  return (
    <button
      onClick={onToggle}
      className={`w-full rounded-[8px] border px-5 py-4 transition-all text-left ${
        allDone
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : isCurrent
          ? 'border-primary-400/60 bg-primary-400/5 shadow-[0_0_20px_rgba(250,204,21,0.06)]'
          : 'border-surface-700 bg-surface-900/70 hover:border-surface-600'
      }`}
      aria-expanded={!collapsed}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border font-mono text-xs font-bold ${
              allDone
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : isCurrent
                ? 'border-primary-400/60 bg-primary-400/10 text-primary-400'
                : 'border-surface-700 bg-surface-850 text-surface-400'
            }`}
          >
            {String(milestone.number).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-surface-500">
              MILESTONE
            </div>
            <div className="text-sm font-semibold text-white truncate">{milestone.title}</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-[11px] text-surface-400">
            {completed}/{total} steps
          </span>
          {allDone && (
            <span className="font-mono text-xs text-emerald-400">🏆</span>
          )}
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-surface-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-surface-500" />
          )}
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            allDone ? 'bg-emerald-400' : 'bg-primary-400'
          }`}
          style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
        />
      </div>
    </button>
  )
}
MilestoneHeader.propTypes = {
  milestone: PropTypes.object.isRequired,
  steps: PropTypes.array.isRequired,
  collapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
}

// ─── Final Project / Completion Node ───────────────────────────────────────────

function FinalProjectNode({ name, reached, onClick }) {
  if (reached) {
    return (
      <button
        onClick={onClick}
        className="w-full max-w-xl mx-auto rounded-[8px] border border-emerald-500/50 bg-emerald-500/5 px-6 py-5 text-center transition-all hover:brightness-110 cursor-pointer shadow-[0_0_24px_rgba(16,185,129,0.10)]"
        aria-label={`Final project: ${name}`}
      >
        <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>COMPLETED</span>
        </div>
        <div className="mt-1.5 text-sm font-semibold text-white">🎓 Final Project</div>
        <div className="mt-0.5 text-xs text-surface-300">{name}</div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full max-w-xl mx-auto rounded-[8px] border border-surface-700 bg-surface-900/60 px-6 py-5 text-center transition-all hover:border-surface-500 cursor-pointer"
      aria-label={`Final project: ${name}`}
    >
      <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-surface-500">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>LOCKED</span>
      </div>
      <div className="mt-1.5 text-sm font-semibold text-white">🎓 Final Project</div>
      <div className="mt-0.5 text-xs text-surface-400">Complete all milestones to unlock</div>
    </button>
  )
}
FinalProjectNode.propTypes = {
  name: PropTypes.string.isRequired,
  reached: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ step, onClose, onMarkComplete, onSkip, onExplain, explaining, explanation }) {
  if (!step) return null
  const meta = statusMeta(step.status)
  const Icon = meta.icon
  const resources = getStepResources(step)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Details: ${step.title}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-surface-800 bg-surface-950 shadow-2xl">
        {/* Panel header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-800 bg-surface-950 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-surface-500">STEP DETAILS</p>
            <h2 className="mt-0.5 text-base font-semibold text-white leading-snug">{step.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-[6px] p-1.5 text-surface-400 transition-colors hover:bg-surface-800 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 px-5 py-5">
          {/* Status & Hours */}
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1 font-mono text-[10px] font-medium uppercase ${meta.border} ${meta.color} bg-transparent`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-surface-400">
              <Clock className="h-3 w-3" />
              {step.estimated_hours || '?'} hours estimated
            </span>
          </div>

          {/* Description */}
          {step.description && (
            <p className="text-sm leading-relaxed text-surface-300">{step.description}</p>
          )}

          {/* Skills */}
          {step.skills && step.skills.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-surface-500">SKILLS COVERED</p>
              <div className="flex flex-wrap gap-1.5">
                {step.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-[4px] border border-surface-700 bg-surface-900 px-2 py-0.5 font-mono text-[10px] text-surface-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Why recommended */}
          <div>
            <button
              onClick={() => onExplain(step)}
              className="flex w-full items-center gap-2 rounded-[6px] border border-surface-700 bg-surface-900/60 px-4 py-3 text-left transition-all hover:border-primary-400/40 hover:bg-surface-800"
            >
              <Lightbulb className="h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
              <span className="font-mono text-xs text-surface-300">Why was this recommended?</span>
            </button>
            {explanation && (
              <div className="mt-2 rounded-[6px] border border-primary-400/20 bg-primary-400/5 px-4 py-3 text-xs leading-relaxed text-surface-300">
                {explaining ? (
                  <div className="flex items-center gap-2 text-surface-500">
                    <Spinner size="sm" /> Generating explanation…
                  </div>
                ) : (
                  explanation
                )}
              </div>
            )}
          </div>

          {/* Prerequisites */}
          {step.prerequisites && step.prerequisites.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-surface-500">PREREQUISITES</p>
              <ul className="space-y-1.5">
                {step.prerequisites.map((prereq) => {
                  const done = typeof prereq === 'object' ? prereq.completed : false
                  const label = typeof prereq === 'object' ? prereq.title : prereq
                  return (
                    <li key={label} className="flex items-center gap-2 text-xs">
                      {done ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <X className="h-3.5 w-3.5 shrink-0 text-red-400" />
                      )}
                      <span className={done ? 'text-surface-400' : 'text-surface-300'}>{label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Resources */}
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-surface-500">LEARNING RESOURCES</p>
            <div className="space-y-2">
              {resources.map((res) => (
                <a
                  key={res.source + res.url}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 rounded-[6px] border px-4 py-2.5 text-xs font-medium transition-all ${resourceButtonStyle(res.source)}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm">{resourceIcon(res.source)}</span>
                    {res.source === 'YouTube' ? '▶ Watch on YouTube' : res.source === 'GeeksforGeeks' ? 'GeeksforGeeks' : res.source === 'W3Schools' ? 'W3Schools' : res.title}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </a>
              ))}
              {/* Official docs fallback */}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(step.title + ' official documentation')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-[6px] border border-surface-700 bg-surface-800/30 px-4 py-2.5 text-xs font-medium text-surface-300 transition-all hover:bg-surface-700/40 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  Official Docs
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </a>
            </div>
          </div>
        </div>

        {/* Actions sticky footer */}
        <div className="sticky bottom-0 border-t border-surface-800 bg-surface-950 px-5 py-4">
          <div className="space-y-2">
            {step.status !== 'completed' && (
              <button
                onClick={() => onMarkComplete(step)}
                className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-emerald-500/15 border border-emerald-500/40 py-2.5 font-mono text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/25 hover:border-emerald-500/60"
              >
                <Check className="h-4 w-4" />
                Mark Complete
              </button>
            )}
            {step.status !== 'skipped' && step.status !== 'completed' && (
              <button
                onClick={() => onSkip(step)}
                className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-surface-700 bg-surface-900/50 py-2.5 font-mono text-xs font-medium text-surface-400 transition-all hover:bg-surface-800 hover:text-surface-200"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
DetailPanel.propTypes = {
  step: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onMarkComplete: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
  onExplain: PropTypes.func.isRequired,
  explaining: PropTypes.bool,
  explanation: PropTypes.string,
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useUserStore()
  const { path, setPath, updateNodeStatus } = usePathStore()
  const activePathId = useGoalsStore((s) => s.activePathId)
  const activeGoal = useGoalsStore((s) =>
    s.goals.find((g) => g.path_id === s.activePathId && g.status === 'active')
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [collapsedMilestones, setCollapsedMilestones] = useState({})
  const [selectedStep, setSelectedStep] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [explaining, setExplaining] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const loadPath = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getPath(activePathId)
      setPath(data)
    } catch (err) {
      if (err?.response?.status === 404) {
        setPath(null)
      } else {
        setError('Unable to load your learning roadmap. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [activePathId, setPath])

  useEffect(() => {
    loadPath()
  }, [loadPath])

  const handleRegenerate = async () => {
    if (!activeGoal?.target_role) {
      toast.error('No active role to regenerate.')
      return
    }
    setRegenerating(true)
    try {
      await useGoalsStore.getState().createGoal({
        target_role: activeGoal.target_role,
        goal: activeGoal.role_label || activeGoal.target_role,
      })
      await loadPath()
      toast.success('Roadmap regenerated for this role.')
    } catch {
      toast.error('Failed to regenerate roadmap.')
    } finally {
      setRegenerating(false)
    }
  }

  const toggleMilestone = (milestoneNumber) => {
    setCollapsedMilestones((prev) => ({
      ...prev,
      [milestoneNumber]: !prev[milestoneNumber],
    }))
  }

  const handleStepClick = (step) => {
    setSelectedStep(step)
    setExplanation('')
    setExplaining(false)
  }

  const handleMarkComplete = async (step) => {
    if (!step) return
    if (step.node_id && activePathId) {
      try {
        await api.completeStep(activePathId, step.node_id)
        updateNodeStatus(step.node_id, 'completed')
        setSelectedStep((prev) => prev ? { ...prev, status: 'completed' } : null)
        toast.success('Step marked as complete!')
        useGoalsStore.getState().fetchGoals()
        await loadPath()
      } catch {
        toast.error('Failed to update progress.')
      }
    }
  }

  const handleSkip = async (step) => {
    if (!step?.node_id || !activePathId) return
    try {
      await api.skipStep(activePathId, step.node_id)
      updateNodeStatus(step.node_id, 'skipped')
      setSelectedStep((prev) => prev ? { ...prev, status: 'skipped' } : null)
      toast.info('Step skipped.')
      useGoalsStore.getState().fetchGoals()
      await loadPath()
    } catch {
      toast.error('Failed to skip step.')
    }
  }

  const handleWhyRecommended = async (step) => {
    if (!step?.resource_id) return
    setExplaining(true)
    setExplanation(' ') // show the box immediately
    try {
      const res = await api.explainRecommendation(step.resource_id)
      setExplanation(res?.explanation || res?.message || 'This step helps build foundational skills for your goal.')
    } catch {
      setExplanation('This step is recommended as part of a structured progression toward your learning goal.')
    } finally {
      setExplaining(false)
    }
  }

  // Build milestone groups from path
  const milestones = path?.milestones || []

  // Summary stats
  const allSteps = milestones.flatMap((m) => m.nodes || [])
  const completedSteps = allSteps.filter((s) => s.status === 'completed').length
  const totalSteps = allSteps.length
  const overallPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const goalName = activeGoal?.role_label ||
    profile?.goal ||
    profile?.target_role?.replace(/_/g, ' ').toUpperCase() ||
    'YOUR LEARNING PATH'
  const estimatedCompletion = path?.estimated_completion || null

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page header */}
        <PageHeader
          tag="PATHFINDER / ROADMAP"
          icon={Map}
          title="LEARNING ROADMAP"
          description="Your personalized, adaptive learning path toward your goal."
          actions={
            <Button
              onClick={handleRegenerate}
              loading={regenerating}
              variant="outline"
              className="font-mono text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Regenerate Path
            </Button>
          }
        />

        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner label="Loading your roadmap…" />
          </div>
        )}

        {error && (
          <ErrorState
            title="Roadmap Unavailable"
            description={error}
            onRetry={loadPath}
          />
        )}

        {!loading && !error && milestones.length === 0 && (
          <EmptyState
            icon={Map}
            title="No roadmap generated yet"
            description="Complete your profile to generate a personalized learning roadmap."
            action={
              <Button onClick={() => navigate('/onboarding')} className="font-mono text-xs">
                Set Up Profile
              </Button>
            }
          />
        )}

        {!loading && !error && milestones.length > 0 && (
          <>
            <RoadmapSwitcher />

            {/* Progress summary bar */}
            <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
                    <span className="font-mono text-xs font-medium uppercase tracking-wider text-white truncate">
                      {goalName}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-surface-400">
                    <span>{completedSteps} / {totalSteps} steps completed</span>
                    {estimatedCompletion && (
                      <>
                        <span className="text-surface-700">·</span>
                        <span>Est. completion: {estimatedCompletion}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-2xl font-bold text-primary-400">{overallPct}%</span>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-800">
                <div
                  className="h-full rounded-full bg-primary-400 transition-all duration-700 ease-out"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>

            {/* Goal node */}
            <div className="flex flex-col items-center">
              <div className="w-full max-w-xl mx-auto rounded-[8px] border border-primary-400/60 bg-surface-900 px-6 py-4 text-center shadow-[0_0_20px_rgba(250,204,21,0.08)]">
                <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
                  <Target className="h-3 w-3" aria-hidden="true" />
                  <span>TARGET OBJECTIVE</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-white">🎯 {goalName}</div>
              </div>

              <Arrow />

              {/* Milestones */}
              <div className="w-full max-w-xl space-y-0">
                {milestones.map((milestone, mIdx) => {
                  const milestoneSteps = milestone.nodes || []
                  const isCollapsed = !!collapsedMilestones[milestone.number]
                  const allDone = milestoneSteps.length > 0 &&
                    milestoneSteps.every((s) => s.status === 'completed')

                  return (
                    <div key={milestone.number || mIdx} className="flex flex-col">
                      {/* Milestone header */}
                      <MilestoneHeader
                        milestone={milestone}
                        steps={milestoneSteps}
                        collapsed={isCollapsed}
                        onToggle={() => toggleMilestone(milestone.number)}
                      />

                      {/* Steps */}
                      {!isCollapsed && milestoneSteps.length > 0 && (
                        <div className="ml-4 pl-4 border-l border-surface-800">
                          {milestoneSteps.map((step, sIdx) => (
                            <div key={step.node_id || sIdx} className="flex flex-col">
                              <Arrow />
                              <StepNode step={step} onClick={handleStepClick} />
                            </div>
                          ))}

                          {/* Milestone complete badge */}
                          {allDone && (
                            <>
                              <Arrow />
                              <div className="flex items-center justify-center gap-2 rounded-[6px] border border-emerald-500/30 bg-emerald-500/5 py-2.5 font-mono text-xs text-emerald-400">
                                <span>🏆</span>
                                <span>MILESTONE {String(milestone.number).padStart(2, '0')} COMPLETE</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Arrow between milestones */}
                      {mIdx < milestones.length - 1 && <Arrow />}
                    </div>
                  )
                })}
              </div>

              {/* Final project / completion */}
              <Arrow />
              <FinalProjectNode
                name={`${goalName} Final Project`}
                reached={overallPct === 100 && totalSteps > 0}
                onClick={() => setSelectedStep({
                  title: `${goalName} Final Project`,
                  status: overallPct === 100 ? 'completed' : 'locked',
                  description: 'Synthesize everything you have learned into a final project. This is the capstone that turns your skills into a portfolio-ready artifact.',
                  estimated_hours: '—',
                })}
              />
            </div>
          </>
        )}
      </div>

      {/* Detail panel */}
      {selectedStep && (
        <DetailPanel
          step={selectedStep}
          onClose={() => setSelectedStep(null)}
          onMarkComplete={() => handleMarkComplete(selectedStep)}
          onSkip={() => handleSkip(selectedStep)}
          onExplain={() => handleWhyRecommended(selectedStep)}
          explaining={explaining}
          explanation={explanation}
        />
      )}
    </AppShell>
  )
}
