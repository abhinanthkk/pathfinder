export const NODE_W = 340
export const NODE_H = 100
export const V_GAP = 36
export const MIL_W = 560
export const MIL_H = 70
export const MIL_GAP = 72
export const GOAL_H = 80
export const GOAL_GAP = 48

// Centre milestone node over the resource column
export const MIL_X = -((MIL_W - NODE_W) / 2)

function goalDisplayName(goal, targetRole) {
  const g = (goal || '').trim()
  if (g) return g
  const role = (targetRole || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  if (role) return role
  return 'Engineering Path'
}

export function computeSummary(path, profile) {
  const milestones = (path?.milestones || []).filter((m) => m && Array.isArray(m.nodes))
  const flat = []
  for (const m of milestones) {
    const mTitle = m.title || `Milestone ${m.number}`
    for (const n of m.nodes || []) {
      flat.push({ ...n, milestoneNumber: m.number, milestoneTitle: mTitle })
    }
  }

  const completed = flat.filter((n) => n.status === 'completed').length
  const skipped   = flat.filter((n) => n.status === 'skipped').length
  const progress  = flat.length ? Math.round((completed / flat.length) * 100) : 0

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

  const next =
    current && currentIndex >= 0 && currentIndex < flat.length - 1
      ? flat[currentIndex + 1]
      : null

  const remainingHours = flat
    .filter((n) => n.status !== 'completed' && n.status !== 'skipped')
    .reduce((s, n) => s + (Number(n.estimated_hours) || 0), 0)

  const totalHours = flat.reduce((s, n) => s + (Number(n.estimated_hours) || 0), 0)

  const weeklyHours = Number(profile?.weekly_hours) || 5
  const weeksRemaining =
    remainingHours > 0 ? Math.ceil(remainingHours / Math.max(1, weeklyHours)) : 0
  const estDate = new Date()
  estDate.setDate(estDate.getDate() + weeksRemaining * 7)
  const estimatedCompletion =
    flat.length === 0
      ? '—'
      : weeksRemaining > 0
      ? estDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'COMPLETED'

  // Human-readable milestone label
  const currentMilestoneObj =
    milestones.find((m) => m.number === current?.milestoneNumber) || milestones[0]
  const currentMilestone =
    currentMilestoneObj?.title || current?.milestoneTitle || '—'
  const currentMilestoneNumber = current?.milestoneNumber || currentMilestoneObj?.number || 1

  return {
    goal: goalDisplayName(profile?.goal, profile?.target_role),
    totalSteps: flat.length,
    completedSteps: completed,
    skippedSteps: skipped,
    progress,
    remainingHours,
    totalHours,
    estimatedCompletion,
    current,
    next,
    currentMilestone,
    currentMilestoneNumber,
    milestones,
  }
}

export function milestoneIsCompleted(milestone) {
  const nodes = milestone?.nodes || []
  return (
    nodes.length > 0 && nodes.every((n) => n.status === 'completed' || n.status === 'skipped')
  )
}

export function milestoneIsCurrent(summary, milestone) {
  return summary.current?.milestoneNumber === milestone.number
}

/**
 * Build the React Flow node/edge arrays from path data.
 *
 * Layout: vertical column — Goal → Milestone header → Resource steps → …
 * Milestones can be collapsed to hide their steps.
 */
export function buildVisualRoadmap(path, profile, collapsedMilestones, onResourceClick) {
  const milestones = (path?.milestones || []).filter((m) => m && Array.isArray(m.nodes))
  const summary = computeSummary(path, profile)
  const collapsed = new Set(collapsedMilestones || [])

  // Flatten to a list of step objects with milestone metadata
  const steps = []
  let stepCounter = 0
  for (const m of milestones) {
    const mTitle = m.title || `Milestone ${m.number}`
    for (const n of m.nodes || []) {
      steps.push({
        ...n,
        key: `node-${n.resource_id}-${m.number}-${stepCounter}`,
        mNumber: m.number,
        marker: mTitle,
      })
      stepCounter += 1
    }
  }

  const inProgressIdx = steps.findIndex((s) => s.status === 'in_progress')
  const activeIdx =
    inProgressIdx >= 0
      ? inProgressIdx
      : steps.findIndex((s) => s.status === 'available' || s.status === 'locked')
  const validIdx = activeIdx >= 0 ? activeIdx : steps.length ? 0 : -1
  const currentKey = validIdx >= 0 ? steps[validIdx].key : null

  const nodes = []
  const edges = []

  let y = 0

  // ── Goal node ────────────────────────────────────────────────────────────
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
    const mTitle = m.title || `Milestone ${m.number}`

    const isMilCurrent = milestoneIsCurrent(summary, m)
    const isMilCompleted = milestoneIsCompleted(m)

    nodes.push(
      createMilestoneNode({
        id: mId,
        number: m.number,
        title: mTitle,
        hours: m.estimated_hours || 0,
        weeks: m.estimated_weeks || 0,
        nodeCount: mNodes.length,
        completedCount: mNodes.filter(
          (n) => n.status === 'completed' || n.status === 'skipped'
        ).length,
        y,
        isCurrent: isMilCurrent,
        isCompleted: isMilCompleted,
        isCollapsed,
        collapsedCount: mNodes.length,
      })
    )

    // Edge into milestone header — gold if it's the current milestone
    edges.push(connector(lastId, mId, isMilCurrent ? '#FACC15' : '#3f3f46', false))
    y += MIL_H + 18
    lastId = mId

    if (isCollapsed) {
      y += MIL_GAP
      continue
    }

    for (let si = 0; si < mNodes.length; si++) {
      const s = mNodes[si]
      const isCurrent = s.key === currentKey
      const isCompleted = s.status === 'completed'
      const isSkipped = s.status === 'skipped'
      const isLocked = s.status === 'locked'

      nodes.push(
        createResourceNode({
          id: s.key,
          n: s,
          y,
          isCurrent,
          isCompleted,
          isSkipped,
          isLocked,
          onResourceClick,
        })
      )

      // Active-path edges in gold; completed chain in emerald; others neutral
      const edgeColor = isCurrent
        ? '#FACC15'
        : isCompleted
        ? '#34d399'
        : '#3f3f46'

      edges.push(connector(lastId, s.key, edgeColor, isCurrent))
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
        title: 'Roadmap Initializing',
        hours: 0,
        weeks: 0,
        nodeCount: 0,
        completedCount: 0,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function connector(source, target, color, animated) {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    animated,
    style: { stroke: color, strokeWidth: animated ? 2 : 1.5 },
    markerEnd: { type: 'arrowclosed', color, width: 12, height: 12 },
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
  id, number, title, hours, weeks, nodeCount, completedCount, y,
  isCurrent, isCompleted, isCollapsed, collapsedCount,
}) {
  return {
    id,
    type: 'milestone',
    position: { x: MIL_X, y },
    data: {
      number,
      title,
      hours: hours || 0,
      weeks: weeks || 0,
      nodeCount,
      completedCount: completedCount || 0,
      isCurrent,
      isCompleted,
      isCollapsed,
      collapsedCount,
    },
    draggable: false,
  }
}

function createResourceNode({ id, n, y, isCurrent, isCompleted, isSkipped, isLocked, onResourceClick }) {
  return {
    id,
    type: 'resource',
    position: { x: 0, y },
    data: {
      ...n,
      nodeKey: id,
      isCurrent,
      isCompleted,
      isSkipped,
      isLocked,
      status: n.status || 'locked',
      estimated_hours: n.estimated_hours || 0,
      skills: Array.isArray(n.skills) ? n.skills : [],
      resources: Array.isArray(n.resources) ? n.resources : [],
      onNodeClick: onResourceClick ? (d) => onResourceClick(d) : undefined,
    },
    draggable: false,
  }
}
