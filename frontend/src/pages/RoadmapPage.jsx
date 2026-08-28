import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  useNodesState, useEdgesState, useReactFlow, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import PropTypes from 'prop-types'
import { Map, RefreshCw, Target, Clock, Check, X, Play, SkipForward, Lightbulb, ChevronRight, ChevronDown } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/shared/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Spinner } from '../components/ui/Spinner'
import useUserStore from '../store/useUserStore'
import usePathStore from '../store/usePathStore'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import {
  NODE_W, NODE_H, MIL_W,
  buildVisualRoadmap,
  computeSummary,
} from '../utils/roadmapLayout'

const GOAL_DATA_SHAPE = {
  label: PropTypes.string,
}
const MILESTONE_DATA_SHAPE = {
  number: PropTypes.number,
  title: PropTypes.string,
  hours: PropTypes.number,
  weeks: PropTypes.number,
  nodeCount: PropTypes.number,
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
  isNext: PropTypes.bool,
  dimmed: PropTypes.bool,
  onNodeClick: PropTypes.func,
}

function GoalNode({ data }) {
  return (
    <div
      className="rounded-[6px] border border-primary-400/70 bg-surface-900 px-6 py-3.5 text-center shadow-panel"
      style={{ width: NODE_W }}
    >
      <Handle type="source" position={Position.Bottom} style={{ background: '#FACC15', border: 'none', width: 6, height: 6 }} />
      <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
        <Target className="h-3 w-3" aria-hidden="true" />
        <span>TARGET OBJECTIVE</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{data.label}</div>
    </div>
  )
}
GoalNode.propTypes = { data: GOAL_DATA_SHAPE }

function MilestoneNode({ data }) {
  const isCurrent = !!data.isCurrent
  const isCompleted = !!data.isCompleted
  const formattedNum = String(data.number).padStart(2, '0')

  return (
    <div
      className={`flex cursor-pointer select-none items-center justify-between gap-4 rounded-[6px] border px-4 py-3 transition-all ${
        isCurrent
          ? 'border-primary-400 bg-surface-900 shadow-highlight'
          : isCompleted
            ? 'border-emerald-500/40 bg-surface-950/90'
            : 'border-surface-700 bg-surface-950/80 hover:border-surface-600'
      }`}
      style={{ width: MIL_W }}
      onClick={data.onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          data.onToggle?.()
        }
      }}
      title={data.isCollapsed ? 'Expand milestone' : 'Collapse milestone'}
      aria-expanded={!data.isCollapsed}
    >
      <Handle type="target" position={Position.Top} style={{ background: isCurrent ? '#FACC15' : '#3f3f46', border: 'none', width: 6, height: 6 }} />
      
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className={`flex h-7 w-8 shrink-0 items-center justify-center rounded-[4px] border font-mono text-xs font-bold ${
            isCurrent
              ? 'border-primary-400/80 bg-primary-400/15 text-primary-400'
              : isCompleted
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-surface-700 bg-surface-850 text-surface-400'
          }`}
        >
          {formattedNum}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] font-medium uppercase tracking-widest text-surface-500">
              MILESTONE {formattedNum}
            </span>
            {isCurrent && (
              <span className="rounded-[3px] border border-primary-400/40 bg-primary-400/10 px-1 py-0.2 font-mono text-[9px] font-semibold text-primary-400 uppercase">
                ACTIVE
              </span>
            )}
            {isCompleted && (
              <span className="rounded-[3px] border border-emerald-500/30 bg-emerald-500/10 px-1 py-0.2 font-mono text-[9px] font-semibold text-emerald-400 uppercase">
                DONE
              </span>
            )}
          </div>
          <div className="truncate text-sm font-semibold text-white">
            {data.title}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right font-mono text-[11px] text-surface-400">
          <div>{data.nodeCount} {data.nodeCount === 1 ? 'STEP' : 'STEPS'}</div>
          <div className="text-[10px] text-surface-500">
            {data.hours ? `~${data.hours}H` : ''}{data.weeks ? ` · ${data.weeks}W` : ''}
          </div>
        </div>
        <div className="text-surface-500">
          {data.isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: isCurrent ? '#FACC15' : '#3f3f46', border: 'none', width: 6, height: 6 }} />
    </div>
  )
}
MilestoneNode.propTypes = { data: MILESTONE_DATA_SHAPE }

function ResourceNode({ data }) {
  const isCurrent = !!data.isCurrent
  const isCompleted = data.status === 'completed'

  return (
    <div
      className={`cursor-pointer rounded-[6px] border px-4 py-3 transition-all ${
        isCurrent
          ? 'border-primary-400 bg-surface-900 shadow-highlight'
          : isCompleted
            ? 'border-emerald-500/30 bg-surface-950/90 hover:border-emerald-500/50'
            : 'border-surface-700 bg-surface-950/80 hover:border-surface-500 hover:bg-surface-900/60'
      }`}
      style={{
        width: NODE_W,
        opacity: data.dimmed === undefined ? 1 : data.dimmed ? 0.35 : 1,
      }}
      onClick={() => data.onNodeClick?.(data)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          data.onNodeClick?.(data)
        }
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: isCurrent ? '#FACC15' : '#3f3f46', border: 'none', width: 6, height: 6 }} />
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <StatusBadge status={data.status} />
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-surface-500">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {data.estimated_hours || 0}h
        </span>
      </div>
      <div className="text-xs font-semibold text-white line-clamp-2">
        {data.title}
      </div>
      {isCurrent && (
        <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] font-semibold text-primary-400">
          <span className="h-1 w-1 rounded-full bg-primary-400" />
          &gt; ACTIVE STEP
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: isCurrent ? '#FACC15' : '#3f3f46', border: 'none', width: 6, height: 6 }} />
    </div>
  )
}
ResourceNode.propTypes = { data: RESOURCE_DATA_SHAPE }

const nodeTypes = { goal: GoalNode, milestone: MilestoneNode, resource: ResourceNode }

function RoadmapFlow({ rfNodes, edges, onNodesChange, onEdgesChange, currentKey, onMilestoneClick, onHoverNode }) {
  const { setCenter } = useReactFlow()
  const [fitted, setFitted] = useState(false)

  useEffect(() => {
    if (!rfNodes.length || fitted) return
    const timer = setTimeout(() => {
      const target = rfNodes.find((n) => n.id === currentKey) || rfNodes.find((n) => n.type === 'goal') || rfNodes[0]
      if (target) {
        const cx = (target.position ? target.position.x : 0) + NODE_W / 2
        const cy = (target.position ? target.position.y : 0) + NODE_H / 2
        try {
          setCenter(cx, cy, { zoom: 0.85, duration: 400 })
        } catch {
          // viewport not ready
        }
      }
      setFitted(true)
    }, 120)
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
      minZoom={0.4}
      maxZoom={1.6}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1e1e24" gap={20} size={1} />
      <Controls position="bottom-left" className="!rounded-[4px] !border !border-surface-700 !bg-surface-900" />
    </ReactFlow>
  )
}
RoadmapFlow.propTypes = {
  rfNodes: PropTypes.array,
  edges: PropTypes.array,
  onNodesChange: PropTypes.func,
  onEdgesChange: PropTypes.func,
  currentKey: PropTypes.string,
  onMilestoneClick: PropTypes.func,
  onHoverNode: PropTypes.func,
}

function ProgressSummary({ summary }) {
  const bar = `${Math.min(100, Math.max(0, summary.progress))}%`
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-surface-800 bg-surface-800 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-surface-950 p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-surface-500">&gt; TARGET GOAL</div>
        <div className="mt-1 text-sm font-semibold text-white truncate">
          {summary.goal}
        </div>
        <div className="mt-1 font-mono text-[11px] text-surface-400">
          ~{Math.round(summary.totalHours)}H TOTAL ALLOCATION
        </div>
      </div>
      
      <div className="bg-surface-950 p-4">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-surface-500">
          <span>&gt; COMPLETION PROGRESS</span>
          <span className="text-primary-400 font-bold">{summary.progress}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-[2px] bg-surface-900 border border-surface-800">
          <div
            className="h-full bg-primary-400 transition-all duration-300"
            style={{ width: bar }}
          />
        </div>
        <div className="mt-1.5 font-mono text-[10px] text-surface-400">
          {summary.completedSteps} OF {summary.totalSteps} STEPS COMPLETED
        </div>
      </div>

      <div className="bg-surface-950 p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-surface-500">&gt; CURRENT MILESTONE</div>
        <div className="mt-1 text-sm font-semibold text-white truncate">
          {summary.currentMilestone}
        </div>
        <div className="mt-1 font-mono text-[10px] text-primary-400/90 truncate">
          STEP: {summary.current?.title || 'READY'}
        </div>
      </div>

      <div className="bg-surface-950 p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-surface-500">&gt; ESTIMATED COMPLETION</div>
        <div className="mt-1 font-mono text-sm font-semibold text-surface-200">
          {summary.estimatedCompletion}
        </div>
        <div className="mt-1 font-mono text-[10px] text-surface-500">
          ~{Math.round(summary.remainingHours)}H REMAINING
        </div>
      </div>
    </div>
  )
}
ProgressSummary.propTypes = {
  summary: PropTypes.shape({
    progress: PropTypes.number,
    goal: PropTypes.string,
    completedSteps: PropTypes.number,
    totalSteps: PropTypes.number,
    currentMilestone: PropTypes.string,
    current: PropTypes.shape({ title: PropTypes.string }),
    totalHours: PropTypes.number,
    remainingHours: PropTypes.number,
    estimatedCompletion: PropTypes.string,
  }),
}

export default function RoadmapPage() {
  const navigate = useNavigate()
  const { profile } = useUserStore()
  const toast = useToast()
  const { path, setPath, loading, setLoading } = usePathStore()
  const [selectedNode, setSelectedNode] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explanationLoading, setExplanationLoading] = useState(false)
  const [collapsedMilestones, setCollapsedMilestones] = useState([])
  const [hoveredNode, setHoveredNode] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const currentKeyRef = useRef(null)

  const [rfNodes, setNodes, onNodesChange] = useNodesState([])
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([])

  const loadPath = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      let existingPath
      try {
        existingPath = await api.getPath()
      } catch {
        existingPath = await api.generatePath()
      }
      setPath(existingPath)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [setLoading, setPath])

  useEffect(() => {
    loadPath()
  }, [loadPath])

  useEffect(() => {
    if (path?.milestones?.length) {
      const handleResourceClick = (node) => {
        setShowExplanation(false)
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
    }
  }, [path, profile, collapsedMilestones, setNodes, setEdges])

  const summary = useMemo(() => computeSummary(path, profile), [path, profile])

  useEffect(() => {
    if (!hoveredNode) {
      setNodes((nds) => nds.map((n) => (n.data ? { ...n, data: { ...n.data, dimmed: undefined } } : n)))
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

  const toggleMilestone = (node) => {
    const num = node.data?.number
    if (!num) return
    setCollapsedMilestones((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    )
  }

  const handleExplain = async () => {
    if (!selectedNode) return
    setExplanationLoading(true)
    setShowExplanation(true)
    try {
      const res = await api.explainRecommendation(selectedNode.resource_id)
      setExplanation(res.explanation)
    } catch {
      setExplanation(`“${selectedNode.title}” was recommended to verify core competency for your career roadmap.`)
    } finally {
      setExplanationLoading(false)
    }
  }

  const handleProgress = async (status) => {
    if (!selectedNode) return
    try {
      const res = await api.updateProgress(selectedNode.resource_id, status)
      if (res.adaptation) {
        usePathStore.getState().addAdaptation(res.adaptation)
      }
      const statusLabel = status.replace('_', ' ').toUpperCase()
      toast.success(`Marked as ${statusLabel}`)
      setSelectedNode(null)
      loadPath()
    } catch {
      toast.error('Unable to update step progress. Please retry.')
    }
  }

  return (
    <AppShell>
      <PageHeader
        tag={`ROADMAP / ${(profile?.target_role || profile?.goal || 'ENGINEERING').toUpperCase()}`}
        icon={Map}
        title="DIRECTED LEARNING GRAPH"
        description="Topologically sequenced learning trajectory with milestone gates, time estimates, and prerequisite verification."
        actions={
          <Button variant="secondary" size="sm" onClick={loadPath} disabled={loading} className="font-mono text-xs">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            RE-CALCULATE GRAPH
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        {loading && !path && (
          <div className="flex items-center justify-center rounded-[8px] border border-surface-800 bg-surface-900/50 py-24">
            <Spinner label="COMPILING LEARNING GRAPH…" />
          </div>
        )}

        {loadError && !loading && (
          <ErrorState
            title="Failed to Load Learning Graph"
            description="Unable to construct topological roadmap. Verify network connection and retry."
            onRetry={loadPath}
          />
        )}

        {!loading && !loadError && path?.milestones?.length ? (
          <>
            {/* Top Telemetry Summary Panel */}
            <ProgressSummary summary={summary} />

            {/* Interactive Graph Surface */}
            <div className="overflow-hidden rounded-[8px] border border-surface-700 bg-surface-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-surface-800 bg-surface-900/80 px-4 py-2 font-mono text-[11px] text-surface-400">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary-400" />
                  <span>VIEWPORT: DIRECTED ACYCLIC GRAPH</span>
                </span>
                <span>DRAG TO PAN · SCROLL TO ZOOM</span>
              </div>
              <div className="h-[70vh]">
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
            </div>
          </>
        ) : (
          !loading &&
          !loadError && (
            <EmptyState
              icon={Map}
              title="No Learning Graph Configured"
              description="Calibrate your technical profile to synthesize a personalized roadmap."
              action={
                <Button onClick={() => navigate('/onboarding')} className="font-mono text-xs">
                  CALIBRATE PROFILE
                </Button>
              }
            />
          )
        )}
      </div>

      {/* Contextual Node Inspector Drawer */}
      {selectedNode && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Node Inspector"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setSelectedNode(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-surface-700 bg-surface-950 p-6 shadow-2xl overflow-y-auto">
            <div className="mb-5 flex items-start justify-between border-b border-surface-800 pb-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
                  &gt; NODE INSPECTOR
                </p>
                {selectedNode.marker && (
                  <p className="mt-1 font-mono text-xs text-surface-500 uppercase">
                    {selectedNode.marker}
                  </p>
                )}
                <h2 className="mt-1 text-lg font-semibold text-white leading-snug">
                  {selectedNode.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="shrink-0 rounded-[6px] p-1.5 text-surface-400 transition-colors hover:bg-surface-850 hover:text-white"
                aria-label="Close inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Status & Hours Metadata */}
            <div className="mb-6 flex items-center justify-between rounded-[6px] border border-surface-800 bg-surface-900/60 p-3">
              <StatusBadge status={selectedNode.status} />
              <span className="font-mono text-xs text-surface-300">
                EST. {selectedNode.estimated_hours} HOURS
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <Button variant="secondary" className="w-full font-mono text-xs" onClick={handleExplain}>
                <Lightbulb className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" />
                WHY WAS THIS RECOMMENDED?
              </Button>

              {selectedNode.status === 'available' && (
                <Button className="w-full font-mono text-xs" onClick={() => handleProgress('in_progress')}>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  START LEARNING STEP
                </Button>
              )}

              {selectedNode.status === 'in_progress' && (
                <>
                  <Button variant="primary" className="w-full font-mono text-xs" onClick={() => handleProgress('completed')}>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    MARK COMPLETED
                  </Button>
                  <Button variant="danger-soft" className="w-full font-mono text-xs" onClick={() => handleProgress('failed')}>
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    FLAG FOR REVISIT
                  </Button>
                </>
              )}

              {(selectedNode.status === 'available' || selectedNode.status === 'in_progress') && (
                <Button variant="ghost" className="w-full font-mono text-xs" onClick={() => handleProgress('skipped')}>
                  <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
                  SKIP THIS STEP
                </Button>
              )}
            </div>

            {/* AI Explanation Stream */}
            {showExplanation && (
              <div className="mt-6 rounded-[6px] border border-surface-700 bg-surface-900/80 p-4">
                <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                  <Lightbulb className="h-3 w-3" />
                  <span>&gt; ADVISORY RATIONALE</span>
                </div>
                {explanationLoading ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-surface-400 font-mono" role="status">
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary-400" />
                    <span>Querying LLM reasoning engine…</span>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-surface-300 whitespace-pre-wrap">
                    {explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}

