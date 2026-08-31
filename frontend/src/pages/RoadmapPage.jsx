import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  useNodesState, useEdgesState, useReactFlow, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import PropTypes from 'prop-types'
import {
  Map, RefreshCw, Target, Clock, Check, X, Play, SkipForward,
  Lightbulb, ChevronRight, ChevronDown, ExternalLink, Lock,
  CheckCircle2, Minus,
} from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/shared/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Spinner } from '../components/ui/Spinner'
import { RoadmapSwitcher } from '../components/roles/RoadmapSwitcher'
import useUserStore from '../store/useUserStore'
import usePathStore from '../store/usePathStore'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import { skillLabel } from '../utils/labels'
import {
  NODE_W, NODE_H, MIL_W,
  buildVisualRoadmap,
  computeSummary,
} from '../utils/roadmapLayout'

// ─────────────────────────────────────────────────────────────────────────────
// PropType shapes
// ─────────────────────────────────────────────────────────────────────────────
const GOAL_DATA_SHAPE = { label: PropTypes.string }
const MILESTONE_DATA_SHAPE = {
  number: PropTypes.number,
  title: PropTypes.string,
  hours: PropTypes.number,
  weeks: PropTypes.number,
  nodeCount: PropTypes.number,
  completedCount: PropTypes.number,
  isCurrent: PropTypes.bool,
  isCompleted: PropTypes.bool,
  isCollapsed: PropTypes.bool,
  onToggle: PropTypes.func,
}
const RESOURCE_DATA_SHAPE = {
  title: PropTypes.string,
  status: PropTypes.string,
  estimated_hours: PropTypes.number,
  isCurrent: PropTypes.bool,
  isSkipped: PropTypes.bool,
  isLocked: PropTypes.bool,
  onNodeClick: PropTypes.func,
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal node — top of graph, shows the target objective
// ─────────────────────────────────────────────────────────────────────────────
function GoalNode({ data }) {
  return (
    <div
      className="rounded-[6px] border border-primary-400/50 bg-surface-900 px-6 py-4 text-center shadow-panel"
      style={{ width: NODE_W }}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#FACC15', border: 'none', width: 6, height: 6 }}
      />
      <div className="flex items-center justify-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-widest text-primary-500">
        <Target className="h-3 w-3" aria-hidden="true" />
        <span>Target Objective</span>
      </div>
      <div className="mt-1.5 text-[15px] font-semibold leading-snug text-white">
        {data.label}
      </div>
    </div>
  )
}
GoalNode.propTypes = { data: PropTypes.shape(GOAL_DATA_SHAPE) }

// ─────────────────────────────────────────────────────────────────────────────
// Milestone node — collapsible section header with progress ring
// ─────────────────────────────────────────────────────────────────────────────
function MilestoneNode({ data }) {
  const isCompleted = data.isCompleted
  const isCurrent   = data.isCurrent
  const pct =
    data.nodeCount > 0
      ? Math.round(((data.completedCount || 0) / data.nodeCount) * 100)
      : 0

  return (
    <div
      className={`flex cursor-pointer select-none items-center gap-4 rounded-[6px] border px-4 py-3 transition-all duration-200 ${
        isCurrent
          ? 'border-primary-400/80 bg-surface-900 shadow-[0_0_0_1px_rgba(250,204,21,0.12)]'
          : isCompleted
          ? 'border-emerald-500/30 bg-surface-950/80'
          : 'border-surface-700 bg-surface-950/70 hover:border-surface-600'
      }`}
      style={{ width: MIL_W }}
      onClick={data.onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={!data.isCollapsed}
      aria-label={`${data.title} — click to ${data.isCollapsed ? 'expand' : 'collapse'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          data.onToggle?.()
        }
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: isCurrent ? '#FACC15' : '#3f3f46', border: 'none', width: 6, height: 6 }}
      />

      {/* Progress ring or status badge */}
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        {isCompleted ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
          </div>
        ) : (
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold ${
              isCurrent
                ? 'bg-primary-400/15 text-primary-400'
                : 'bg-surface-800 text-surface-400'
            }`}
          >
            {data.number}
          </div>
        )}
      </div>

      {/* Title + time estimate */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-medium uppercase tracking-widest text-surface-500">
            Milestone {String(data.number).padStart(2, '0')}
          </span>
          {isCurrent && (
            <span className="inline-flex items-center rounded-full bg-primary-400/10 px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-wider text-primary-400">
              Current
            </span>
          )}
        </div>
        <p className="truncate text-xs font-medium text-white">{data.title}</p>
      </div>

      {/* Stats + collapse arrow */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right font-mono text-[10px] text-surface-500">
          <div>{data.completedCount ?? 0}/{data.nodeCount} steps</div>
          {pct > 0 && <div className="text-surface-400">{pct}%</div>}
        </div>
        <div className="text-surface-500 transition-transform duration-150">
          {data.isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: isCurrent ? '#FACC15' : '#3f3f46', border: 'none', width: 6, height: 6 }}
      />
    </div>
  )
}
MilestoneNode.propTypes = { data: PropTypes.shape(MILESTONE_DATA_SHAPE) }

// ─────────────────────────────────────────────────────────────────────────────
// Resource node — interactive card for a learning step
// ─────────────────────────────────────────────────────────────────────────────
function ResourceNode({ data }) {
  const isCurrent   = data.isCurrent
  const isCompleted = data.status === 'completed'
  const isSkipped   = data.status === 'skipped'
  const isLocked    = data.status === 'locked'

  let containerCls =
    'border-surface-800 bg-surface-900 hover:border-surface-700 hover:bg-surface-900/90'
  if (isCompleted) containerCls = 'border-emerald-500/20 bg-surface-950/90 hover:border-emerald-500/30'
  if (isCurrent)   containerCls = 'border-primary-400/80 bg-surface-900 shadow-[0_0_0_1px_rgba(250,204,21,0.2)]'
  if (isSkipped)   containerCls = 'border-surface-700/50 bg-surface-950/50 opacity-50'
  if (isLocked && !isCurrent) containerCls = 'border-surface-800 bg-surface-950/60 opacity-60 cursor-default'

  const skills = Array.isArray(data.skills) ? data.skills.slice(0, 3) : []

  return (
    <div
      className={`cursor-pointer rounded-[6px] border px-4 py-3 transition-all duration-150 ${containerCls}`}
      style={{ width: NODE_W }}
      onClick={() => !isLocked && data.onNodeClick?.(data)}
      role={isLocked ? 'presentation' : 'button'}
      tabIndex={isLocked ? -1 : 0}
      aria-label={isLocked ? `${data.title} — locked` : `Inspect: ${data.title}`}
      onKeyDown={(e) => {
        if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          data.onNodeClick?.(data)
        }
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: isCurrent ? '#FACC15' : '#27272a', border: 'none', width: 6, height: 6 }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Header row: status icon + step title */}
          <div className="flex items-center gap-1.5">
            {isCompleted && (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            )}
            {isCurrent && (
              <Play className="h-3 w-3 shrink-0 fill-primary-400 text-primary-400" aria-hidden="true" />
            )}
            {isLocked && !isCurrent && (
              <Lock className="h-3 w-3 shrink-0 text-surface-600" aria-hidden="true" />
            )}
            {isSkipped && (
              <Minus className="h-3 w-3 shrink-0 text-surface-500" aria-hidden="true" />
            )}
            <p
              className={`truncate text-xs font-semibold ${
                isCompleted
                  ? 'text-surface-300'
                  : isLocked
                  ? 'text-surface-500'
                  : 'text-white'
              }`}
            >
              {data.title}
            </p>
          </div>

          {/* Skill tags */}
          {skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-surface-800/80 px-1.5 py-0.5 font-mono text-[9px] text-surface-400"
                >
                  {skillLabel(skill)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right column: status badge + duration */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={data.status || 'locked'} />
          {data.estimated_hours ? (
            <span className="font-mono text-[9px] text-surface-500">
              {data.estimated_hours}h
            </span>
          ) : null}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: isCurrent ? '#FACC15' : '#27272a', border: 'none', width: 6, height: 6 }}
      />
    </div>
  )
}
ResourceNode.propTypes = { data: PropTypes.shape(RESOURCE_DATA_SHAPE) }

const NODE_TYPES = {
  goal: GoalNode,
  milestone: MilestoneNode,
  resource: ResourceNode,
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner ReactFlow wrapper (needs useReactFlow inside ReactFlowProvider)
// ─────────────────────────────────────────────────────────────────────────────
function RoadmapFlow({
  rfNodes,
  edges,
  onNodesChange,
  onEdgesChange,
  currentKey,
  onMilestoneClick,
  onHoverNode,
}) {
  const { setCenter } = useReactFlow()
  const [fitted, setFitted] = useState(false)
  const nodeTypes = useMemo(() => NODE_TYPES, [])

  // Auto-center on current node on initial load
  useEffect(() => {
    if (fitted || !rfNodes.length) return
    const timer = setTimeout(() => {
      const activeNode = rfNodes.find((n) => n.id === currentKey) || rfNodes[0]
      if (activeNode) {
        try {
          setCenter(
            (activeNode.position?.x || 0) + NODE_W / 2,
            (activeNode.position?.y || 0) + NODE_H / 2,
            { zoom: 0.9, duration: 400 }
          )
        } catch {
          // viewport not mounted yet
        }
      }
      setFitted(true)
    }, 150)
    return () => clearTimeout(timer)
  }, [rfNodes, fitted, currentKey, setCenter])

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => node.type === 'milestone' && onMilestoneClick(node)}
      onNodeMouseEnter={(_, node) => node.type === 'resource' && onHoverNode(node.id)}
      onNodeMouseLeave={() => onHoverNode(null)}
      minZoom={0.3}
      maxZoom={1.8}
      proOptions={{ hideAttribution: true }}
      fitViewOptions={{ padding: 0.15 }}
    >
      <Background color="#18181b" gap={24} size={1} />
      <Controls
        position="bottom-left"
        showInteractive={false}
        className="!rounded-[4px] !border !border-surface-800 !bg-surface-950 !shadow-panel"
      />
    </ReactFlow>
  )
}
RoadmapFlow.propTypes = {
  rfNodes: PropTypes.array.isRequired,
  edges: PropTypes.array.isRequired,
  onNodesChange: PropTypes.func.isRequired,
  onEdgesChange: PropTypes.func.isRequired,
  currentKey: PropTypes.string,
  onMilestoneClick: PropTypes.func.isRequired,
  onHoverNode: PropTypes.func.isRequired,
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry bar — four-metric summary above the graph
// ─────────────────────────────────────────────────────────────────────────────
function ProgressSummary({ summary }) {
  const bar = `${Math.min(100, Math.max(0, summary.progress))}%`

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[8px] border border-surface-800 bg-surface-800 lg:grid-cols-4">
      {/* Goal */}
      <div className="bg-surface-950 p-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-surface-500">
          Target Goal
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-white">
          {summary.goal}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-surface-500">
          {Math.round(summary.totalHours)}h total
        </p>
      </div>

      {/* Progress */}
      <div className="bg-surface-950 p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-widest text-surface-500">
            Progress
          </p>
          <span className="font-mono text-sm font-semibold text-primary-400">
            {summary.progress}%
          </span>
        </div>
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-surface-800">
          <div
            className="h-full rounded-full bg-primary-400 transition-all duration-500"
            style={{ width: bar }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-surface-500">
          {summary.completedSteps}/{summary.totalSteps} steps completed
        </p>
      </div>

      {/* Remaining */}
      <div className="bg-surface-950 p-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-surface-500">
          Remaining
        </p>
        <p className="mt-1 text-sm font-semibold text-white">
          {Math.round(summary.remainingHours)}h
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-surface-500">
          {summary.totalSteps - summary.completedSteps - (summary.skippedSteps || 0)} steps to go
        </p>
      </div>

      {/* Current phase */}
      <div className="bg-surface-950 p-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-surface-500">
          Active Phase
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-white">
          {summary.currentMilestone}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-surface-500">
          Phase {summary.currentMilestoneNumber}
        </p>
      </div>
    </div>
  )
}
ProgressSummary.propTypes = { summary: PropTypes.object.isRequired }

// ─────────────────────────────────────────────────────────────────────────────
// Node Inspector Drawer — slides in from right when a resource node is clicked
// ─────────────────────────────────────────────────────────────────────────────
function NodeInspector({
  node,
  onClose,
  onProgress,
  onExplain,
  explanationLoading,
  explanation,
  showExplanation,
}) {
  const isCompleted  = node.status === 'completed'
  const isCurrent    = node.isCurrent
  const isSkipped    = node.status === 'skipped'
  const skills       = Array.isArray(node.skills) ? node.skills : []
  const resources    = Array.isArray(node.resources) ? node.resources : []

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Node Inspector"
    >
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-surface-800 bg-surface-950 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-surface-800 bg-surface-950/95 px-6 py-5 backdrop-blur-sm">
          <div className="min-w-0 pr-3">
            <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-primary-400">
              Node Inspector
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              {node.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-surface-800 text-surface-400 hover:border-surface-700 hover:text-white"
            aria-label="Close inspector"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={node.status} />
            {node.estimated_hours ? (
              <span className="inline-flex items-center gap-1 rounded-[4px] border border-surface-800 bg-surface-900 px-2 py-0.5 font-mono text-[10px] text-surface-400">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {node.estimated_hours} hours
              </span>
            ) : null}
          </div>

          {/* Description */}
          {node.description && (
            <div>
              <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-surface-500">
                Description
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-surface-300">
                {node.description}
              </p>
            </div>
          )}

          {/* Skills targeted */}
          {skills.length > 0 && (
            <div>
              <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-surface-500">
                Competencies Targeted
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-[4px] border border-surface-800 bg-surface-900 px-2 py-1 font-mono text-[10px] text-surface-300"
                  >
                    {skillLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resources list */}
          {resources.length > 0 && (
            <div>
              <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-surface-500">
                Recommended Resources
              </p>
              <div className="mt-2 space-y-2">
                {resources.map((res, i) => (
                  <a
                    key={i}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-[4px] border border-surface-800 bg-surface-900/60 px-3 py-2.5 transition-colors hover:border-surface-700 hover:bg-surface-900"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs font-medium text-white">
                        {res.title || res.name || `Resource ${i + 1}`}
                      </p>
                      {res.type && (
                        <p className="font-mono text-[9px] text-surface-500 uppercase">
                          {res.type}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-surface-500" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* AI Explanation Accordion */}
          <div className="rounded-[6px] border border-surface-800 bg-surface-900/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-widest text-surface-400">
                <Lightbulb className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                <span>AI Recommendation Engine</span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={onExplain}
                loading={explanationLoading}
              >
                {showExplanation ? 'Refresh' : 'Why this?'}
              </Button>
            </div>

            {showExplanation && (
              <div className="mt-3 border-t border-surface-800/60 pt-3">
                {explanationLoading ? (
                  <div className="py-2">
                    <Spinner label="Consulting recommendation graph…" size="sm" />
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-surface-300">
                    {explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 border-t border-surface-800 bg-surface-950 px-6 py-4">
          <p className="mb-3 font-mono text-[9px] font-medium uppercase tracking-widest text-surface-500">
            Update Node Status
          </p>
          <div className="grid grid-cols-2 gap-2">
            {!isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onProgress('completed')}
                className="w-full"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Mark Complete
              </Button>
            )}
            {isCompleted && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onProgress('in_progress')}
                className="w-full"
              >
                Reopen Step
              </Button>
            )}
            {!isCurrent && !isCompleted && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onProgress('in_progress')}
                className="w-full"
              >
                <Play className="h-3 w-3" aria-hidden="true" />
                Set Active
              </Button>
            )}
            {!isSkipped && !isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onProgress('skipped')}
                className="w-full"
              >
                <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                Skip Node
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
NodeInspector.propTypes = {
  node: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onProgress: PropTypes.func.isRequired,
  onExplain: PropTypes.func.isRequired,
  explanationLoading: PropTypes.bool.isRequired,
  explanation: PropTypes.string,
  showExplanation: PropTypes.bool.isRequired,
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useUserStore()
  const { path, setPath } = usePathStore()

  const [rfNodes, setNodes, onNodesChange] = useNodesState([])
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([])
  const [collapsedMilestones, setCollapsedMilestones] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)

  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const [explanation, setExplanation] = useState('')
  const [explanationLoading, setExplanationLoading] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const currentKeyRef = useRef(null)

  // ── Fetch roadmap data ───────────────────────────────────────────────────
  const loadPath = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await api.getLearningPath()
      setPath(data)
    } catch {
      setLoadError(true)
      toast.error('Unable to fetch learning roadmap.')
    } finally {
      setLoading(false)
    }
  }, [setPath, toast])

  // ── Regenerate roadmap ───────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    setRegenerating(true)
    try {
      const data = await api.generateLearningPath({ recalculate: true })
      setPath(data)
      toast.success('Learning roadmap recalculated.')
    } catch {
      toast.error('Failed to recalculate roadmap.')
    } finally {
      setRegenerating(false)
    }
  }, [setPath, toast])

  useEffect(() => {
    loadPath()
  }, [loadPath])

  // ── Build React Flow graph from path data ────────────────────────────────
  useEffect(() => {
    if (!path?.milestones?.length) return

    const handleResourceClick = (node) => {
      setShowExplanation(false)
      setExplanation('')
      setSelectedNode({ ...node, marker: node.marker || '' })
    }

    const { nodes, edges, currentKey } = buildVisualRoadmap(
      path,
      profile,
      collapsedMilestones,
      handleResourceClick
    )
    setNodes(nodes)
    setEdges(edges)
    currentKeyRef.current = currentKey
  }, [path, profile, collapsedMilestones, setNodes, setEdges])

  const summary = useMemo(() => computeSummary(path, profile), [path, profile])

  // ── Hover dimming — dim non-adjacent nodes ───────────────────────────────
  useEffect(() => {
    if (!hoveredNode) {
      setNodes((nds) =>
        nds.map((n) => (n.data ? { ...n, data: { ...n.data, dimmed: undefined } } : n))
      )
      return
    }
    const related = new Set([hoveredNode])
    for (const e of rfEdges) {
      if (e.source === hoveredNode) related.add(e.target)
      if (e.target === hoveredNode) related.add(e.source)
    }
    setNodes((nds) =>
      nds.map((n) =>
        n.data && n.type !== 'milestone'
          ? { ...n, data: { ...n.data, dimmed: !related.has(n.id) } }
          : n
      )
    )
  }, [hoveredNode, rfEdges, setNodes])

  // ── Milestone collapse toggle ────────────────────────────────────────────
  const toggleMilestone = useCallback((node) => {
    const num = node.data?.number
    if (!num) return
    setCollapsedMilestones((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    )
  }, [])

  // ── AI explanation ───────────────────────────────────────────────────────
  const handleExplain = useCallback(async () => {
    if (!selectedNode) return
    setExplanationLoading(true)
    setShowExplanation(true)
    try {
      const res = await api.explainRecommendation(selectedNode.resource_id)
      setExplanation(res.explanation)
    } catch {
      setExplanation(
        `"${selectedNode.title}" was recommended to verify core competency for your career roadmap.`
      )
    } finally {
      setExplanationLoading(false)
    }
  }, [selectedNode])

  // ── Progress actions ─────────────────────────────────────────────────────
  const handleProgress = useCallback(
    async (status) => {
      if (!selectedNode) return
      try {
        const res = await api.updateProgress(selectedNode.resource_id, status)
        if (res.adaptation) {
          usePathStore.getState().addAdaptation?.(res.adaptation)
        }
        toast.success(`Step marked as ${status.replace('_', ' ')}`)
        setSelectedNode(null)
        loadPath()
      } catch {
        toast.error('Unable to update step progress. Please retry.')
      }
    },
    [selectedNode, toast, loadPath]
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <PageHeader
        tag={`Roadmap / ${(profile?.target_role || profile?.goal || 'Engineering').replace(/_/g, ' ')}`}
        icon={Map}
        title="Learning Roadmap"
        description="Your personalized, milestone-driven learning path. Click any node to inspect and act on it."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRegenerate}
            loading={regenerating}
            disabled={loading}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Recalculate
          </Button>
        }
      />

      <div className="mt-6 space-y-5">
        {/* Role / Goal switcher */}
        <RoadmapSwitcher />

        {/* Loading state */}
        {loading && !path && (
          <div className="flex min-h-[50vh] items-center justify-center rounded-[8px] border border-surface-800 bg-surface-900/40">
            <Spinner label="Compiling learning graph…" />
          </div>
        )}

        {/* Error state */}
        {loadError && !loading && (
          <ErrorState
            title="Failed to load roadmap"
            description="We could not retrieve your learning path. Check your connection and try again."
            onRetry={loadPath}
          />
        )}

        {/* Graph + telemetry */}
        {!loading && !loadError && path?.milestones?.length ? (
          <>
            {/* Telemetry */}
            <ProgressSummary summary={summary} />

            {/* Graph surface */}
            <div className="overflow-hidden rounded-[8px] border border-surface-800 bg-[#0d0d10] shadow-panel">
              {/* Graph toolbar */}
              <div className="flex items-center justify-between border-b border-surface-800 bg-surface-950/90 px-4 py-2.5">
                <div className="flex items-center gap-2 font-mono text-[10px] text-surface-500">
                  <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-primary-400" aria-hidden="true" />
                  Directed learning graph
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] text-surface-600">
                  <span>Pan · Scroll to zoom</span>
                </div>
              </div>

              {/* React Flow viewport */}
              <div className="h-[68vh] min-h-[400px]">
                <ReactFlowProvider>
                  <RoadmapFlow
                    rfNodes={rfNodes}
                    edges={rfEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    currentKey={currentKeyRef.current}
                    onMilestoneClick={toggleMilestone}
                    onHoverNode={setHoveredNode}
                  />
                </ReactFlowProvider>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 border-t border-surface-800/60 bg-surface-950/80 px-4 py-2.5">
                {[
                  { color: 'bg-primary-400', label: 'Active' },
                  { color: 'bg-emerald-500', label: 'Completed' },
                  { color: 'bg-surface-600', label: 'Locked' },
                  { color: 'bg-surface-500/40', label: 'Skipped' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
                    <span className="font-mono text-[9px] uppercase tracking-wider text-surface-500">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          !loading && !loadError && (
            <EmptyState
              icon={Map}
              title="No roadmap configured yet"
              description="Set up your learning profile to generate a personalized roadmap."
              action={
                <Button onClick={() => navigate('/onboarding')}>
                  Set Up Profile
                </Button>
              }
            />
          )
        )}
      </div>

      {/* Node inspector drawer */}
      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onProgress={handleProgress}
          onExplain={handleExplain}
          explanationLoading={explanationLoading}
          explanation={explanation}
          showExplanation={showExplanation}
        />
      )}
    </AppShell>
  )
}
