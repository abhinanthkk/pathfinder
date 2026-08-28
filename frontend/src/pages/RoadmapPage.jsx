import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  useNodesState, useEdgesState, useReactFlow, Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import PropTypes from 'prop-types'
import { Map, RefreshCw } from 'lucide-react'
import { AppShell } from '../components/layout/AppShell'
import { PageHeader } from '../components/shared/PageHeader'
import { Card } from '../components/ui/Card'
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

const STATUS_META = {
  completed: { color: '#10b981', border: '#10b981', bg: '#022c22', text: '#6ee7b7', icon: '✓', label: 'Completed' },
  in_progress: { color: '#f59e0b', border: '#f59e0b', bg: '#1e1b0b', text: '#fcd34d', icon: '●', label: 'You are here' },
  available: { color: '#6366f1', border: '#6366f1', bg: '#0f0f2a', text: '#c7d2fe', icon: '→', label: 'Recommended next' },
  locked: { color: '#64748b', border: '#334155', bg: '#0f172a', text: '#94a3b8', icon: '🔒', label: 'Future step' },
  skipped: { color: '#6b7280', border: '#4b5563', bg: '#1f2937', text: '#9ca3af', icon: '⏭', label: 'Skipped' },
  failed: { color: '#ef4444', border: '#ef4444', bg: '#2a0f0f', text: '#fca5a5', icon: '✕', label: 'Revisit' },
}

const GOAL_DATA_SHAPE = {
  label: PropTypes.string,
}
const MILESTONE_DATA_SHAPE = {
  number: PropTypes.number,
  title: PropTypes.string,
  icon: PropTypes.string,
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
      className="rounded-2xl border-2 px-6 py-4 text-center"
      style={{
        width: NODE_W,
        background: 'linear-gradient(135deg, #312e8155, #0f172a)',
        borderColor: '#4f46e5',
        boxShadow: '0 8px 40px -8px rgba(79,70,229,0.5)',
      }}
    >
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', border: 'none' }} />
      <div className="mb-1 text-2xl" aria-hidden="true">🎯</div>
      <div className="text-base font-bold text-white leading-snug">{data.label}</div>
    </div>
  )
}
GoalNode.propTypes = { data: GOAL_DATA_SHAPE }

function MilestoneNode({ data }) {
  return (
    <div
      className="flex cursor-pointer select-none items-center gap-4 rounded-xl border-2 px-5 py-3"
      style={{
        width: MIL_W,
        background: data.isCurrent
          ? 'linear-gradient(135deg, #312e81, #1e1b4b)'
          : data.isCompleted
            ? 'linear-gradient(135deg, #064e3b, #022c22)'
            : '#111c33',
        borderColor: data.isCurrent ? '#818cf8' : data.isCompleted ? '#10b981' : '#334155',
        boxShadow: data.isCurrent ? '0 6px 30px -6px rgba(129,140,248,0.4)' : 'none',
      }}
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
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1', border: 'none' }} />
      <div className="text-2xl" aria-hidden="true">{data.icon}</div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: data.isCurrent ? '#a5b4fc' : data.isCompleted ? '#6ee7b7' : '#64748b' }}
        >
          Milestone {data.number}
          {data.isCurrent ? ' • You are here' : ''}
          {data.isCompleted ? ' • Complete' : ''}
        </div>
        <div className="truncate text-lg font-bold text-white leading-tight">{data.title}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold" style={{ color: data.isCurrent ? '#c7d2fe' : '#94a3b8' }}>
          {data.nodeCount} {data.nodeCount === 1 ? 'step' : 'steps'}
        </div>
        <div className="text-xs" style={{ color: '#64748b' }}>
          ~{data.hours}h{data.weeks ? ` · ${data.weeks}w` : ''}
        </div>
      </div>
      <div className="shrink-0 text-sm text-surface-400" aria-hidden="true">
        {data.isCollapsed ? '▸' : '▾'}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', border: 'none' }} />
    </div>
  )
}
MilestoneNode.propTypes = { data: MILESTONE_DATA_SHAPE }

function ResourceNode({ data }) {
  const meta = STATUS_META[data.status] || STATUS_META.locked
  const isCurrent = !!data.isCurrent
  const isNext = !!data.isNext

  return (
    <div
      className="cursor-pointer rounded-2xl border-2 px-5 py-4 transition-all"
      style={{
        width: NODE_W,
        background: isCurrent ? '#141021' : meta.bg,
        borderColor: isCurrent ? STATUS_META.in_progress.border : isNext ? STATUS_META.available.border : meta.border,
        boxShadow: isCurrent
          ? '0 8px 36px -8px rgba(245,158,11,0.45)'
          : isNext
            ? '0 4px 24px -8px rgba(99,102,241,0.35)'
            : 'none',
        opacity: data.dimmed === undefined ? 1 : data.dimmed ? 0.3 : 1,
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
      <Handle type="target" position={Position.Top} style={{ background: meta.border, border: 'none' }} />
      <div className="mb-2 flex items-center justify-between">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: `${meta.color}22`, color: meta.text }}
        >
          {meta.icon} {isCurrent ? 'You are here' : isNext ? 'Next step' : meta.label}
        </span>
        <span className="text-xs font-medium" style={{ color: isCurrent ? '#fcd34d' : '#64748b' }}>
          ⏱ {data.estimated_hours || 0}h
        </span>
      </div>
      <div className="text-[15px] font-bold text-white leading-snug">{data.title}</div>
      {isCurrent && (
        <div className="mt-2 text-xs font-semibold" style={{ color: '#fbbf24' }}>
          ● Continue learning from here
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: meta.border, border: 'none' }} />
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
      <Background color="#1e293b" gap={24} size={1} />
      <Controls position="bottom-left" />
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-surface-500">Your goal</div>
        <div className="font-semibold text-white">{summary.goal}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-surface-500">
          Progress · {summary.completedSteps}/{summary.totalSteps} steps
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all"
            style={{ width: bar }}
          />
        </div>
        <div className="mt-1 text-sm text-surface-400">{summary.progress}% complete</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-surface-500">Current milestone</div>
        <div className="font-semibold text-white">
          {summary.currentMilestoneNumber || '—'}
        </div>
        <div className="text-xs text-surface-500">Current step: {summary.current?.title || '—'}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-surface-500">Next up</div>
        <div className="font-semibold text-white">{summary.next?.title || 'Final steps'}</div>
        <div className="text-xs text-surface-500">
          Estimated remaining: {Math.round(summary.remainingHours)}h
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
    currentMilestoneNumber: PropTypes.number,
    current: PropTypes.shape({ title: PropTypes.string }),
    next: PropTypes.shape({ title: PropTypes.string }),
    remainingHours: PropTypes.number,
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
      setExplanation(`“${selectedNode.title}” was recommended to help you progress toward your goal.`)
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
      const statusLabel = status.replace('_', ' ')
      toast.success(`Marked as ${statusLabel}`)
      setSelectedNode(null)
      loadPath()
    } catch {
      toast.error('We couldn’t update your progress. Please try again.')
    }
  }

  return (
    <AppShell>
      <PageHeader
        icon={Map}
        title="Your learning roadmap"
        description="Follow the path from where you are to your goal. Select a step to get details."
        actions={
          <Button variant="secondary" onClick={loadPath} disabled={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="mt-8 space-y-6">
        {loading && !path && (
          <Card className="flex items-center justify-center py-20">
            <Spinner label="Building your learning path…" />
          </Card>
        )}

        {loadError && !loading && (
          <ErrorState
            title="Couldn't load your roadmap"
            description="We ran into a problem fetching your learning path. Please try again."
            onRetry={loadPath}
          />
        )}

        {!loading && !loadError && path?.milestones?.length ? (
          <>
            <Card>
              <ProgressSummary summary={summary} />
            </Card>

            <Card padded={false} className="overflow-hidden">
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
            </Card>
          </>
        ) : (
          !loading &&
          !loadError && (
            <EmptyState
              icon={Map}
              title="No roadmap yet"
              description="Set up your profile to generate a personalized learning path."
              action={
                <Button onClick={() => navigate('/onboarding')}>Set up your profile</Button>
              }
            />
          )
        )}
      </div>

      {/* Detail sidebar */}
      {selectedNode && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Step details"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm lg:bg-transparent"
            onClick={() => setSelectedNode(null)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto border-l border-surface-700 bg-surface-900 p-6 shadow-2xl sm:max-w-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="min-w-0">
                {selectedNode.marker && (
                  <span className="text-xs font-medium text-primary-400">{selectedNode.marker}</span>
                )}
                <h2 className="mt-1 text-xl font-bold text-white">{selectedNode.title}</h2>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="shrink-0 rounded-lg p-1.5 text-surface-400 transition-colors hover:text-surface-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                aria-label="Close details"
              >
                <span aria-hidden="true" className="text-xl">×</span>
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <StatusBadge status={selectedNode.status} />
              <span className="text-surface-500" aria-hidden="true">·</span>
              <span className="text-sm text-surface-400">{selectedNode.estimated_hours}h estimated</span>
            </div>

            <div className="space-y-3">
              <Button variant="secondary" className="w-full" onClick={handleExplain}>
                💡 Why was this recommended?
              </Button>

              {selectedNode.status === 'available' && (
                <Button className="w-full" onClick={() => handleProgress('in_progress')}>
                  🔄 Start learning
                </Button>
              )}

              {selectedNode.status === 'in_progress' && (
                <>
                  <Button variant="primary" className="w-full" onClick={() => handleProgress('completed')}>
                    ✅ Mark complete
                  </Button>
                  <Button variant="danger-soft" className="w-full" onClick={() => handleProgress('failed')}>
                    ❌ Mark failed
                  </Button>
                </>
              )}

              {(selectedNode.status === 'available' || selectedNode.status === 'in_progress') && (
                <Button variant="ghost" className="w-full" onClick={() => handleProgress('skipped')}>
                  ⏭️ Skip
                </Button>
              )}
            </div>

            {showExplanation && (
              <div className="mt-4 rounded-xl border border-surface-700 bg-surface-800 p-4">
                <h4 className="mb-2 text-sm font-semibold text-primary-400">
                  Why this was recommended
                </h4>
                {explanationLoading ? (
                  <div className="flex gap-1 py-2" role="status">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-surface-500" />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-surface-500"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span className="sr-only">Loading explanation…</span>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-surface-300">{explanation}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
