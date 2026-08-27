import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import useUserStore from '../store/useUserStore'
import usePathStore from '../store/usePathStore'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  NODE_W,
  NODE_H,
  MIL_W,
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

function GoalNode({ data }) {
  return (
    <div
      className="rounded-2xl px-6 py-4 text-center border-2"
      style={{
        width: NODE_W,
        background: 'linear-gradient(135deg, #312e8155, #0f172a)',
        borderColor: '#4f46e5',
        boxShadow: '0 8px 40px -8px rgba(79,70,229,0.5)',
      }}
    >
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', border: 'none' }} />
      <div className="text-2xl mb-1">🎯</div>
      <div className="text-base font-bold text-white leading-snug">{data.label}</div>
    </div>
  )
}

function MilestoneNode({ data }) {
  return (
    <div
      className="rounded-xl flex items-center gap-4 px-5 py-3 cursor-pointer border-2 select-none"
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
      title={data.isCollapsed ? 'Expand milestone' : 'Collapse milestone'}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1', border: 'none' }} />
      <div className="text-2xl">{data.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ color: data.isCurrent ? '#a5b4fc' : data.isCompleted ? '#6ee7b7' : '#64748b' }}>
          Milestone {data.number}{data.isCurrent ? ' • You are here' : ''}{data.isCompleted ? ' • Complete' : ''}
        </div>
        <div className="text-lg font-bold text-white leading-tight truncate">{data.title}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold" style={{ color: data.isCurrent ? '#c7d2fe' : '#94a3b8' }}>
          {data.nodeCount} {data.nodeCount === 1 ? 'step' : 'steps'}
        </div>
        <div className="text-xs" style={{ color: '#64748b' }}>
          ~{data.hours}h {data.weeks ? `· ${data.weeks}w` : ''}
        </div>
      </div>
      <div className="text-surface-400 shrink-0 text-sm">
        {data.isCollapsed ? '▸' : '▾'}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', border: 'none' }} />
    </div>
  )
}

function ResourceNode({ data }) {
  const meta = STATUS_META[data.status] || STATUS_META.locked
  const isCurrent = !!data.isCurrent
  const isNext = !!data.isNext

  return (
    <div
      className="rounded-2xl px-5 py-4 border-2 transition-all"
      style={{
        width: NODE_W,
        background: isCurrent ? '#141021' : meta.bg,
        borderColor: isCurrent ? STATUS_META.in_progress.border : isNext ? STATUS_META.available.border : meta.border,
        boxShadow: isCurrent ? '0 8px 36px -8px rgba(245,158,11,0.45)' : isNext ? '0 4px 24px -8px rgba(99,102,241,0.35)' : 'none',
        opacity: data.dimmed === undefined ? 1 : data.dimmed ? 0.3 : 1,
        cursor: 'pointer',
      }}
      onClick={() => data.onNodeClick?.(data)}
    >
      <Handle type="target" position={Position.Top} style={{ background: meta.border, border: 'none' }} />
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5"
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
          /* viewport not ready */
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
      <Controls className="!bg-surface-800 !border-surface-700 !rounded-xl" position="bottom-left" />
    </ReactFlow>
  )
}

export default function RoadmapPage() {
  const navigate = useNavigate()
  const { userId, profile } = useUserStore()
  const { logout } = useAuth()
  const { path, setPath, setLoading, loading } = usePathStore()
  const [selectedNode, setSelectedNode] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explanationLoading, setExplanationLoading] = useState(false)
  const [collapsedMilestones, setCollapsedMilestones] = useState([])
  const [hoveredNode, setHoveredNode] = useState(null)

  const [rfNodes, setNodes, onNodesChange] = useNodesState([])
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState([])
  const currentKeyRef = useRef(null)

  useEffect(() => {
    if (!userId) {
      navigate('/onboarding')
    }
  }, [userId, navigate])

  useEffect(() => {
    if (userId) {
      loadPath()
    }
  }, [userId])

  useEffect(() => {
    if (path?.milestones?.length) {
      const handleResourceClick = (node) => setSelectedNode({ ...node, marker: node.marker || '' })
      const { nodes, edges, currentKey } = buildVisualRoadmap(path, profile, collapsedMilestones, handleResourceClick)
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

  const loadPath = async () => {
    setLoading(true)
    try {
      let existingPath
      try {
        existingPath = await api.getPath()
      } catch {
        existingPath = await api.generatePath()
      }
      setPath(existingPath)
    } catch (e) {
      console.error('Failed to load path:', e)
    } finally {
      setLoading(false)
    }
  }

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
      setExplanation(`"${selectedNode.title}" was recommended to help you progress toward your goal.`)
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
      setSelectedNode(null)
      loadPath()
    } catch (e) {
      console.error('Failed to update progress:', e)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Generating your learning path...</p>
        </div>
      </div>
    )
  }

  const pct = summary.progress

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-surface-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-surface-400 hover:text-white transition-colors">
            ← Pathfinder
          </button>
          <h1 className="text-lg font-semibold text-white">Your Learning Roadmap</h1>
        </div>
        <div className="flex items-center gap-3">
          {path && (
            <span className="text-sm text-surface-400">
              {path.total_estimated_hours}h · {path.estimated_completion_date}
            </span>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg bg-surface-800 text-surface-300 hover:bg-surface-700 text-sm transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="flex-shrink-0 border-b border-surface-800 bg-surface-900/60 px-6 py-4">
        <ProgressSummary summary={summary} />
      </div>

      <div className="flex-1 relative min-h-0">
        {rfNodes.length > 0 ? (
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
        ) : (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <p className="text-surface-400 mb-4">No learning path generated yet</p>
              <button
                onClick={loadPath}
                className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-medium transition-all"
              >
                Generate Path
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 h-full w-96 bg-surface-900 border-l border-surface-700 p-6 overflow-y-auto z-20"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-medium text-primary-400">{selectedNode.marker || 'Learning step'}</span>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedNode.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-surface-400 hover:text-white transition-colors text-xl"
                >
                  ×
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium capitalize" style={{ color: STATUS_META[selectedNode.status]?.color || '#94a3b8' }}>
                  {selectedNode.status.replace('_', ' ')}
                </span>
                <span className="text-surface-500 text-sm">·</span>
                <span className="text-sm text-surface-400">{selectedNode.estimated_hours}h estimated</span>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={handleExplain}
                  className="w-full py-2.5 rounded-xl bg-surface-800 border border-surface-700 hover:border-primary-500 text-surface-200 text-sm font-medium transition-all"
                >
                  💡 Why was this recommended?
                </button>

                {selectedNode.status === 'available' && (
                  <button
                    onClick={() => handleProgress('in_progress')}
                    className="w-full py-2.5 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400 text-sm font-medium transition-all hover:bg-amber-600/30"
                  >
                    🔄 Start Learning
                  </button>
                )}

                {selectedNode.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => handleProgress('completed')}
                      className="w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium transition-all hover:bg-emerald-600/30"
                    >
                      ✅ Mark Complete
                    </button>
                    <button
                      onClick={() => handleProgress('failed')}
                      className="w-full py-2.5 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-medium transition-all hover:bg-red-600/30"
                    >
                      ❌ Mark Failed
                    </button>
                  </>
                )}

                {(selectedNode.status === 'available' || selectedNode.status === 'in_progress') && (
                  <button
                    onClick={() => handleProgress('skipped')}
                    className="w-full py-2.5 rounded-xl bg-surface-800 border border-surface-700 text-surface-400 text-sm font-medium transition-all hover:bg-surface-700"
                  >
                    ⏭️ Skip
                  </button>
                )}
              </div>

              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-surface-800 rounded-xl p-4 border border-surface-700"
                >
                  <h4 className="text-sm font-semibold text-primary-400 mb-2">Why this was recommended</h4>
                  {explanationLoading ? (
                    <div className="flex gap-1 py-2">
                      <div className="w-2 h-2 bg-surface-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-surface-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    </div>
                  ) : (
                    <p className="text-sm text-surface-300 leading-relaxed">{explanation}</p>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ProgressSummary({ summary }) {
  const bar = `${Math.min(100, Math.max(0, summary.progress))}%`
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-surface-500 mb-1">Your Goal</div>
        <div className="text-white font-semibold">{summary.goal}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-surface-500 mb-1">
          Overall Progress · {summary.completedSteps}/{summary.totalSteps} steps
        </div>
        <div className="h-2.5 w-full rounded-full bg-surface-800 overflow-hidden mt-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all"
            style={{ width: bar }}
          />
        </div>
        <div className="text-sm text-surface-400 mt-1">{summary.progress}% complete</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-surface-500 mb-1">Current Milestone</div>
        <div className="text-white font-semibold">{summary.currentMilestone}</div>
        <div className="text-xs text-surface-500 mt-1">Current step: {summary.current?.title || '—'}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-surface-500 mb-1">Next Up</div>
        <div className="text-white font-semibold">{summary.next?.title || 'Final steps'}</div>
        <div className="text-xs text-surface-500 mt-1">Estimated remaining: {Math.round(summary.remainingHours)}h</div>
      </div>
    </div>
  )
}
