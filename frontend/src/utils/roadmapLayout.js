export const NODE_W = 300
export const NODE_H = 104
export const V_GAP = 50
export const MIL_W = 560
export const MIL_H = 78
export const MIL_GAP = 96
export const GOAL_H = 96
export const GOAL_GAP = 60

// Horizontal offset so a wider milestone node shares the same vertical center column as resource nodes.
export const MIL_X = -((MIL_W - NODE_W) / 2)

const MILESTONE_ICONS = ['🌀', '🧱', '⚙️', '🔗', '🎓', '🚀', '💎']

function goalDisplayName(goal, targetRole) {
  const g = (goal || '').trim()
  if (g) return g
  const role = (targetRole || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  if (role) return `Become a ${role}`
  return 'Your Learning Journey'
}

export function computeSummary(path, profile) {
  const milestones = (path?.milestones || []).filter((m) => m && Array.isArray(m.nodes))
  const flat = []
  for (const m of milestones) {
    for (const n of m.nodes || []) {
      flat.push({ ...n, milestoneNumber: m.number, milestoneTitle: m.title })
    }
  }

  const completed = flat.filter((n) => n.status === 'completed').length
  const progress = flat.length ? Math.round((completed / flat.length) * 100) : 0

  let current = null
  let currentIndex = -1
  const inProgressIdx = flat.findIndex((n) => n.status === 'in_progress')
  if (inProgressIdx >= 0) {
    currentIndex = inProgressIdx
    current = flat[inProgressIdx]
  } else {
    const availIdx = flat.findIndex((n) => n.status === 'available' || n.status === 'locked')
    if (availIdx >= 0) {
      currentIndex = availIdx
      current = flat[availIdx]
    } else if (flat.length) {
      currentIndex = 0
      current = flat[0]
    }
  }

  const next = current && currentIndex >= 0 && currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null

  const remainingHours = flat
    .filter((n) => n.status !== 'completed' && n.status !== 'skipped')
    .reduce((s, n) => s + (Number(n.estimated_hours) || 0), 0)

  const currentMilestone =
    current?.milestoneTitle ||
    (milestones[0] ? milestones[0].title : '')
  const currentMilestoneNumber = current?.milestoneNumber || (milestones[0] ? milestones[0].number : 1)

  return {
    goal: goalDisplayName(profile?.goal, profile?.target_role),
    totalSteps: flat.length,
    completedSteps: completed,
    progress,
    remainingHours,
    current,
    next,
    currentMilestone,
    currentMilestoneNumber,
    milestones,
  }
}

export function milestoneIsCompleted(milestone) {
  const nodes = milestone?.nodes || []
  return nodes.length > 0 && nodes.every((n) => n.status === 'completed')
}

export function milestoneIsCurrent(summary, milestone) {
  return summary.current?.milestoneNumber === milestone.number
}

// Build a vertical, milestone-based flow layout from the dynamic path data.
export function buildVisualRoadmap(path, profile, collapsedMilestones, onResourceClick) {
  const milestones = (path?.milestones || []).filter((m) => m && Array.isArray(m.nodes))
  const summary = computeSummary(path, profile)
  const collapsed = new Set(collapsedMilestones || [])

  // --- Flatten all steps (milestone order preserved; nodes already topologically ordered) ---
  const steps = []
  let stepCounter = 0
  for (const m of milestones) {
    for (const n of m.nodes || []) {
      steps.push({
        ...n,
        key: `node-${n.resource_id}-${m.number}-${stepCounter}`,
        mNumber: m.number,
        marker: m.title,
      })
      stepCounter += 1
    }
  }

  // --- Determine current & next step indices ---
  const inProgressIdx = steps.findIndex((s) => s.status === 'in_progress')
  const activeIdx = inProgressIdx >= 0 ? inProgressIdx : steps.findIndex((s) => s.status === 'available' || s.status === 'locked')
  const validIdx = activeIdx >= 0 ? activeIdx : (steps.length ? 0 : -1)
  const currentKey = validIdx >= 0 ? steps[validIdx].key : null
  const isFirstOpen = validIdx === 0

  const nodes = []
  const edges = []

  let y = 0

  // GOAL node
  nodes.push(createGoalNode('goal', summary.goal, y))
  y += GOAL_H + GOAL_GAP
  let lastId = 'goal'
  let hasAnyMilestone = false

  for (let mi = 0; mi < milestones.length; mi++) {
    const m = milestones[mi]
    const mNodes = steps.filter((s) => s.mNumber === m.number)
    if (mNodes.length === 0) continue
    hasAnyMilestone = true

    const mId = `milestone-${m.number}`
    const isCollapsed = collapsed.has(m.number)
    const icon = MILESTONE_ICONS[(m.number - 1) % MILESTONE_ICONS.length]

    nodes.push(
      createMilestoneNode({
        id: mId,
        number: m.number,
        title: m.title,
        icon,
        hours: m.estimated_hours || 0,
        weeks: m.estimated_weeks || 0,
        nodeCount: mNodes.length,
        y,
        isCurrent: milestoneIsCurrent(summary, m),
        isCompleted: milestoneIsCompleted(m),
        isCollapsed,
        collapsedCount: mNodes.length,
      })
    )
    edges.push(connector(lastId, mId, '#1e293b', false))
    y += MIL_H + 26
    lastId = mId

    if (isCollapsed) {
      y += MIL_GAP
      continue
    }

    for (let si = 0; si < mNodes.length; si++) {
      const s = mNodes[si]
      const isCurrent = s.key === currentKey
      const isNext = !isCurrent && currentKey === null && isFirstOpen && si === 0
      nodes.push(createResourceNode({ id: s.key, n: s, y, isCurrent, isNext, onResourceClick }))
      edges.push(connector(lastId, s.key, isCurrent ? '#6366f1' : '#1e293b', isCurrent))
      y += NODE_H + V_GAP
      lastId = s.key
    }

    y += MIL_GAP - V_GAP
  }

  if (!hasAnyMilestone) {
    nodes.push(
      createMilestoneNode({
        id: 'milestone-none',
        number: 1,
        title: 'No roadmap yet',
        icon: '📭',
        hours: 0,
        weeks: 0,
        nodeCount: 0,
        y,
        isCurrent: false,
        isCompleted: false,
        isCollapsed: false,
        collapsedCount: 0,
      })
    )
  }

  return { nodes, edges, summary, currentKey, totalHeight: y }
}

function connector(source, target, color, animated) {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    animated,
    style: { stroke: color, strokeWidth: animated ? 3 : 2 },
    markerEnd: { type: 'arrowclosed', color, width: 18, height: 18 },
  }
}

function createGoalNode(id, label, y) {
  return {
    id,
    type: 'goal',
    position: { x: 0, y },
    data: { label },
    draggable: false,
  }
}

function createMilestoneNode({
  id, number, title, icon, hours, weeks, nodeCount, y,
  isCurrent, isCompleted, isCollapsed, collapsedCount,
}) {
  return {
    id,
    type: 'milestone',
    position: { x: MIL_X, y },
    data: {
      number,
      title,
      icon,
      hours: hours || 0,
      weeks: weeks || 0,
      nodeCount,
      isCurrent,
      isCompleted,
      isCollapsed,
      collapsedCount,
    },
    draggable: false,
  }
}

function createResourceNode({ id, n, y, isCurrent, isNext, onResourceClick }) {
  return {
    id,
    type: 'resource',
    position: { x: 0, y },
    data: {
      ...n,
      nodeKey: id,
      isCurrent,
      isNext,
      status: n.status || 'locked',
      estimated_hours: n.estimated_hours || 0,
      onNodeClick: onResourceClick ? (d) => onResourceClick(d) : undefined,
    },
    draggable: false,
  }
}
