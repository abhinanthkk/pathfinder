import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Map, RefreshCw, Target, Clock, Check, Lock, SkipForward,
  Play, ChevronDown, ChevronRight, X, Lightbulb, ExternalLink,
  BookOpen, CheckCircle2,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/Progress'
import { Spinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import useUserStore from '../store/useUserStore'
import usePathStore from '../store/usePathStore'
import useGoalsStore from '../store/useGoalsStore'
import { useToast } from '../context/ToastContext'
import { RoadmapSwitcher } from '../components/roles/RoadmapSwitcher'
import api from '../services/api'
import { EASE } from '../lib/motion'
import { getStepResources, resourceTone, resourceMark } from '../utils/resources'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusMeta(status) {
  switch (status) {
    case 'completed':
      return {
        icon: CheckCircle2,
        label: 'Completed',
        color: 'text-emerald-400',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-500/[0.04]',
      }
    case 'in_progress':
    case 'current':
      return {
        icon: Play,
        label: 'You are here',
        color: 'text-primary-400',
        border: 'border-primary-400/50',
        bg: 'bg-primary-400/[0.05]',
      }
    case 'skipped':
      return {
        icon: SkipForward,
        label: 'Skipped',
        color: 'text-surface-500',
        border: 'border-surface-800',
        bg: 'bg-surface-950/60',
      }
    case 'locked':
      return {
        icon: Lock,
        label: 'Locked',
        color: 'text-surface-600',
        border: 'border-surface-800',
        bg: 'bg-surface-950/40',
      }
    default:
      return {
        icon: ChevronRight,
        label: 'Next',
        color: 'text-surface-300',
        border: 'border-surface-700',
        bg: 'bg-surface-900/50',
      }
  }
}

// ─── Vertical Arrow ────────────────────────────────────────────────────────────

function Arrow() {
  return (
    <div className="flex justify-center py-0.5" aria-hidden="true">
      <div className="w-px h-6 bg-gradient-to-b from-surface-700 to-surface-800" />
    </div>
  )
}

// ─── Step Node ─────────────────────────────────────────────────────────────────

function StepNode({ step, onClick }) {
  const meta = statusMeta(step.status)
  const Icon = meta.icon
  const isLocked = step.status === 'locked'
  const isSkipped = step.status === 'skipped'
  const isCurrent = step.status === 'in_progress' || step.status === 'current'
  const resources = getStepResources(step)

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      onClick={() => !isLocked && onClick(step)}
      disabled={isLocked}
      className={`group relative w-full rounded-[12px] border px-4 py-3.5 text-left transition-all ${meta.border} ${meta.bg} ${
        isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-glow-hover'
      } ${isSkipped ? 'opacity-55' : ''}`}
      aria-disabled={isLocked}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={`flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-wider ${meta.color}`}>
            <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{meta.label}</span>
            {isCurrent && (
              <span className="relative ml-1.5 flex items-center gap-1.5 rounded-full border border-primary-400/40 bg-primary-400/10 px-2 py-0.5 font-mono text-[9px] font-bold text-primary-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-400" />
                </span>
                Active
              </span>
            )}
          </div>

          <h3
            className={`mt-1.5 text-sm font-semibold leading-snug ${
              isSkipped ? 'text-surface-500 line-through' : 'text-white'
            }`}
          >
            {step.title}
          </h3>
        </div>

        <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-surface-500">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{step.estimated_hours || '?'}h</span>
        </span>
      </div>

      {!isLocked && resources.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {resources.slice(0, 3).map((res) => (
            <a
              key={res.source + res.url}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] transition-all ${resourceTone(res.source)}`}
              title={res.title}
            >
              <span>{resourceMark(res.source).glyph}</span>
              <span>{res.source}</span>
            </a>
          ))}
        </div>
      )}
    </motion.button>
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
  const isCurrent = steps.some((s) => s.status === 'in_progress' || s.status === 'current')

  return (
    <button
      onClick={onToggle}
      className={`group w-full rounded-[12px] border px-5 py-4 text-left transition-all ${
        allDone
          ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
          : isCurrent
            ? 'border-primary-400/50 bg-primary-400/[0.05] shadow-glow'
            : 'border-surface-800 bg-surface-925 hover:border-surface-700'
      }`}
      aria-expanded={!collapsed}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border font-mono text-xs font-bold transition-transform group-hover:scale-105 ${
              allDone
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : isCurrent
                  ? 'border-primary-400/60 bg-primary-400/10 text-primary-400'
                  : 'border-surface-700 bg-surface-900 text-surface-400'
            }`}
          >
            {String(milestone.number).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className={`font-mono text-[10px] uppercase tracking-wider ${allDone ? 'text-emerald-400/80' : isCurrent ? 'text-primary-400/80' : 'text-surface-500'}`}>
              Milestone {String(milestone.number).padStart(2, '0')}
            </div>
            <div className="truncate text-sm font-semibold text-white">{milestone.title}</div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-[11px] text-surface-400">
            {completed}/{total} steps
          </span>
          {allDone && <span className="font-mono text-xs text-emerald-400" aria-hidden="true">🏆</span>}
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-surface-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-surface-500" />
          )}
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={completed} max={total} tone={allDone ? 'emerald' : 'gold'} className="h-1" />
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
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      onClick={onClick}
      className={`group mx-auto w-full max-w-xl rounded-[12px] border px-6 py-5 text-center transition-all ${
        reached
          ? 'border-emerald-500/50 bg-emerald-500/[0.05] hover:-translate-y-0.5 hover:shadow-glow-hover'
          : 'border-surface-800 bg-surface-925 hover:border-surface-700'
      }`}
      aria-label={`Final project: ${name}`}
    >
      <div
        className={`flex items-center justify-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest ${
          reached ? 'text-emerald-400' : 'text-surface-500'
        }`}
      >
        {reached ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
        <span>{reached ? 'Completed' : 'Locked'}</span>
      </div>
      <div className="mt-1.5 text-sm font-semibold text-white">
        <span aria-hidden="true">🎓</span> Final Project
      </div>
      <div className={`mt-0.5 text-xs ${reached ? 'text-surface-300' : 'text-surface-500'}`}>{name}</div>
      {!reached && (
        <div className="mt-0.5 text-[10px] text-surface-600">Complete all milestones to unlock</div>
      )}
    </motion.button>
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
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label={`Details: ${step.title}`}>
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 380, damping: 40 }}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-surface-800 bg-surface-925 shadow-panel"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-surface-800/80 bg-surface-925/95 px-5 py-4 backdrop-blur-md">
          <div className="min-w-0">
            <p className="section-label text-primary-400">Step details</p>
            <h2 className="mt-0.5 truncate text-base font-semibold leading-snug text-white">{step.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-surface-400 transition-colors hover:bg-surface-800 hover:text-white focus:outline-none"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase ${meta.border} ${meta.color}`}>
              <Icon className="h-3 w-3" aria-hidden="true" />
              {meta.label}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs text-surface-400">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {step.estimated_hours || '?'} hours estimated
            </span>
          </div>

          {step.description && (
            <p className="text-sm leading-relaxed text-surface-300">{step.description}</p>
          )}

          {step.skills && step.skills.length > 0 && (
            <div>
              <p className="section-label mb-2 text-surface-500">Skills covered</p>
              <div className="flex flex-wrap gap-1.5">
                {step.skills.map((skill) => (
                  <span key={skill} className="badge-line font-mono text-[10px]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={() => onExplain(step)}
              className="flex w-full items-center gap-2.5 rounded-[10px] border border-surface-700 bg-surface-900/60 px-4 py-3 text-left transition-all hover:border-primary-400/40 hover:bg-surface-900"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-primary-400/25 bg-primary-400/10 text-primary-400">
                <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="font-mono text-xs text-surface-300">Why was this recommended?</span>
            </button>
            {explanation && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 rounded-[10px] border border-primary-400/20 bg-primary-400/[0.05] px-4 py-3 text-xs leading-relaxed text-surface-300"
              >
                {explaining ? (
                  <div className="flex items-center gap-2 text-surface-500">
                    <Spinner label="" className="scale-75" /> Generating explanation…
                  </div>
                ) : (
                  explanation
                )}
              </motion.div>
            )}
          </div>

          {step.prerequisites && step.prerequisites.length > 0 && (
            <div>
              <p className="section-label mb-2 text-surface-500">Prerequisites</p>
              <ul className="space-y-1.5">
                {step.prerequisites.map((prereq) => {
                  const done = typeof prereq === 'object' ? prereq.completed : false
                  const label = typeof prereq === 'object' ? prereq.title : prereq
                  return (
                    <li key={label} className="flex items-center gap-2 text-xs">
                      {done ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <X className="h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden="true" />
                      )}
                      <span className={done ? 'text-surface-400' : 'text-surface-300'}>{label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div>
            <p className="section-label mb-2 text-surface-500">Learning resources</p>
            <div className="space-y-2">
              {resources.map((res) => (
                <a
                  key={res.source + res.url}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between gap-3 rounded-[10px] border px-4 py-2.5 text-xs font-medium transition-all ${resourceTone(res.source)}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-sm">{resourceMark(res.source).glyph}</span>
                    {resourceMark(res.source).label}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                </a>
              ))}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(step.title + ' official documentation')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-[10px] border border-surface-700 bg-surface-900/40 px-4 py-2.5 text-xs font-medium text-surface-300 transition-all hover:bg-surface-800 hover:text-white"
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Official Docs
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-surface-800/80 bg-surface-925/95 px-5 py-4 backdrop-blur-md">
          <div className="space-y-2">
            {step.status !== 'completed' && (
              <Button onClick={() => onMarkComplete(step)} className="w-full">
                <Check className="h-4 w-4" aria-hidden="true" />
                Mark Complete
              </Button>
            )}
            {step.status !== 'skipped' && step.status !== 'completed' && (
              <Button onClick={() => onSkip(step)} variant="secondary" className="w-full">
                <SkipForward className="h-4 w-4" aria-hidden="true" />
                Skip
              </Button>
            )}
          </div>
        </div>
      </motion.div>
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
        setSelectedStep((prev) => (prev ? { ...prev, status: 'completed' } : null))
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
      setSelectedStep((prev) => (prev ? { ...prev, status: 'skipped' } : null))
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
    setExplanation(' ')
    try {
      const res = await api.explainRecommendation(step.resource_id)
      setExplanation(res?.explanation || res?.message || 'This step helps build foundational skills for your goal.')
    } catch {
      setExplanation('This step is recommended as part of a structured progression toward your learning goal.')
    } finally {
      setExplaining(false)
    }
  }

  const milestones = path?.milestones || []

  const allSteps = milestones.flatMap((m) => m.nodes || [])
  const completedSteps = allSteps.filter((s) => s.status === 'completed').length
  const totalSteps = allSteps.length
  const overallPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const goalName =
    activeGoal?.role_label ||
    profile?.goal ||
    profile?.target_role?.replace(/_/g, ' ').toUpperCase() ||
    'YOUR LEARNING PATH'
  const estimatedCompletion = path?.estimated_completion || null

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          tag="Roadmap"
          icon={Map}
          title="Learning Roadmap"
          description="Your personalized, adaptive learning path toward your goal."
          actions={
            <Button onClick={handleRegenerate} loading={regenerating} variant="outline">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Regenerate Path
            </Button>
          }
        />

        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner label="Loading your roadmap…" />
          </div>
        )}

        {error && <ErrorState title="Roadmap unavailable" description={error} onRetry={loadPath} />}

        {!loading && !error && milestones.length === 0 && (
          <EmptyState
            icon={Map}
            title="No roadmap generated yet"
            description="Complete your profile to generate a personalized learning roadmap."
            action={<Button onClick={() => navigate('/onboarding')}>Set Up Profile</Button>}
          />
        )}

        {!loading && !error && milestones.length > 0 && (
          <>
            <RoadmapSwitcher />

            {/* Progress summary bar */}
            <Card accent padded>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 shrink-0 text-primary-400" aria-hidden="true" />
                    <span className="truncate text-sm font-semibold text-white">{goalName}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[11px] text-surface-400">
                    <span>{completedSteps} / {totalSteps} steps completed</span>
                    {estimatedCompletion && (
                      <>
                        <span className="text-surface-700" aria-hidden="true">·</span>
                        <span>Est. completion: {estimatedCompletion}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="stat-number text-2xl font-bold text-primary-400">{overallPct}%</span>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-surface-500">complete</p>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar value={overallPct} max={100} tone="gold" className="h-2" />
              </div>
            </Card>

            {/* Journey */}
            <div className="flex flex-col items-center">
              <div className="mx-auto w-full max-w-xl rounded-[12px] border border-primary-400/50 bg-surface-925 px-6 py-4 text-center shadow-glow">
                <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
                  <Target className="h-3 w-3" aria-hidden="true" />
                  Target Objective
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  <span aria-hidden="true">🎯</span> {goalName}
                </div>
              </div>

              <Arrow />

              <div className="w-full max-w-xl space-y-0">
                {milestones.map((milestone, mIdx) => {
                  const milestoneSteps = milestone.nodes || []
                  const isCollapsed = !!collapsedMilestones[milestone.number]
                  const allDone =
                    milestoneSteps.length > 0 &&
                    milestoneSteps.every((s) => s.status === 'completed')

                  return (
                    <div key={milestone.number || mIdx} className="flex flex-col">
                      <MilestoneHeader
                        milestone={milestone}
                        steps={milestoneSteps}
                        collapsed={isCollapsed}
                        onToggle={() => toggleMilestone(milestone.number)}
                      />

                      <AnimatePresence initial={false}>
                        {!isCollapsed && milestoneSteps.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.28, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <div className="ml-5 border-l border-surface-800 pl-4">
                              {milestoneSteps.map((step) => (
                                <div key={step.node_id}>
                                  <Arrow />
                                  <StepNode step={step} onClick={handleStepClick} />
                                </div>
                              ))}

                              {allDone && (
                                <>
                                  <Arrow />
                                  <div className="flex items-center justify-center gap-2 rounded-[10px] border border-emerald-500/25 bg-emerald-500/[0.05] py-2.5 font-mono text-xs text-emerald-400">
                                    <span aria-hidden="true">🏆</span>
                                    <span>Milestone {String(milestone.number).padStart(2, '0')} complete</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {mIdx < milestones.length - 1 && <Arrow />}
                    </div>
                  )
                })}
              </div>

              <Arrow />
              <FinalProjectNode
                name={`${goalName} Final Project`}
                reached={overallPct === 100 && totalSteps > 0}
                onClick={() =>
                  setSelectedStep({
                    title: `${goalName} Final Project`,
                    status: overallPct === 100 ? 'completed' : 'locked',
                    description:
                      'Synthesize everything you have learned into a final project. This is the capstone that turns your skills into a portfolio-ready artifact.',
                    estimated_hours: '—',
                  })
                }
              />
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
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
      </AnimatePresence>
    </AppShell>
  )
}