import { useNavigate } from 'react-router-dom'
import { Plus, Check, Layers, CheckCircle2, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import useGoalsStore from '../../store/useGoalsStore'
import { useToast } from '../../context/ToastContext'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { CountUp } from '../ui/CountUp'
import Stagger from '../shared/motion/Stagger'
import StaggerItem from '../shared/motion/StaggerItem'
import { fadeUp } from '../../lib/motion'
import { useState } from 'react'

/**
 * Editorial, reusable roadmap switcher. Used at the top of the Progress page
 * (and the Roadmap page) so the user can swap between their active learning
 * paths without a reload. Switching updates the global activePathId which all
 * data pages subscribe to.
 *
 * The switcher is calm: rows reveal on mount, the active path carries a quiet
 * indicator that follows the selection, and switching never blanks the page —
 * the subscribed data view re-staggers once the new path resolves.
 */
export function RoadmapSwitcher() {
  const navigate = useNavigate()
  const toast = useToast()
  const { goals, activePathId, status, activate, deletePath } = useGoalsStore()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [switchingId, setSwitchingId] = useState(null)

  const activeGoals = (goals || []).filter((g) => g.status === 'active')
  const completedGoals = (goals || []).filter((g) => g.status === 'completed')
  const totalGoals = activeGoals.length + completedGoals.length

  const handleActivate = async (pathId) => {
    if (pathId === activePathId) return
    const before = activePathId
    setSwitchingId(pathId)
    try {
      const res = await activate(pathId)
      if (res.ok) {
        toast.success('Switched learning path.')
      } else {
        toast.error('Failed to switch path.')
        if (before) useGoalsStore.setState({ activePathId: before })
      }
    } catch {
      toast.error('Failed to switch path.')
      if (before) useGoalsStore.setState({ activePathId: before })
    } finally {
      setSwitchingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePath(deleteTarget.path_id)
      toast.success(`Deleted the ${deleteTarget.role_label} path.`)
      setDeleteTarget(null)
    } catch (err) {
      const detail = err?.response?.data?.detail || ''
      toast.error(detail || 'Failed to delete path.')
    } finally {
      setDeleting(false)
    }
  }

  const rowCls = (isActive, kind) =>
    `group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${
      isActive
        ? 'border-primary-200 bg-primary-50/70'
        : kind === 'completed'
          ? 'border-line bg-surface hover:border-emerald-200 hover:bg-emerald-50/40'
          : 'border-line bg-surface hover:border-primary-200 hover:bg-primary-50/40'
    }`

  return (
    <Stagger className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5" staggerChildren={0.06}>
      <StaggerItem>
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-primary-700">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Learning paths
            <span className="rounded-md border border-line bg-surface-secondary px-1.5 py-0.5 font-semibold text-ink-400">
              {totalGoals}
            </span>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-semibold text-ink-400 transition-all hover:border-primary-300 hover:text-primary-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Add Path
          </button>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="h-px w-full bg-line" aria-hidden="true" />
      </StaggerItem>

      {status === 'loading' && (
        <p className="py-1 text-[10px] text-ink-400">Loading paths…</p>
      )}

      {status !== 'loading' && totalGoals === 0 && (
        <StaggerItem>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-3 text-left text-xs font-medium text-ink-400 transition-all hover:border-primary-300 hover:text-primary-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Create your first learning path
          </button>
        </StaggerItem>
      )}

      {activeGoals.length > 0 && (
        <div className="space-y-1.5">
          {activeGoals.map((g) => {
            const isActive = g.path_id === activePathId
            const isSwitching = switchingId === g.path_id
            return (
              <StaggerItem key={g.path_id} variants={fadeUp({ y: 14 })}>
                <div className={rowCls(isActive, 'active')}>
                  {isActive && (
                    <motion.span
                      layoutId="active-path-marker"
                      className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-primary-600"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    onClick={() => handleActivate(g.path_id)}
                    disabled={isActive}
                    className="flex min-w-0 flex-1 items-center gap-3 pl-3 text-left focus:outline-none"
                    aria-pressed={isActive}
                    aria-label={`Switch to ${g.role_label}`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        isActive ? 'bg-primary-600' : 'bg-line-strong'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-medium ${
                          isActive ? 'text-primary-700' : 'text-ink'
                        }`}
                      >
                        {g.role_label}
                        {isSwitching && (
                          <span className="ml-2 inline-block animate-pulse text-[10px] font-normal text-primary-600/70">
                            switching…
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] text-ink-400">
                        <CountUp end={Math.round(g.progress_percentage || 0)} suffix="%" />
                        {g.current_step_title ? ` · ${g.current_step_title}` : ''}
                      </span>
                    </span>
                  </button>
                  {isActive && (
                    <Check className="mr-1 h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden="true" />
                  )}
                  <button
                    onClick={() => setDeleteTarget(g)}
                    disabled={totalGoals <= 1}
                    className="mr-1 shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus-visible:ring-1 focus-visible:ring-danger-400"
                    aria-label={`Delete ${g.role_label} path`}
                    title={totalGoals <= 1 ? 'You need at least one learning path' : `Delete ${g.role_label} path`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </StaggerItem>
            )
          })}
        </div>
      )}

      {completedGoals.length > 0 && (
        <StaggerItem>
          <p className="mb-1 mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Completed
          </p>
        </StaggerItem>
      )}

      {completedGoals.length > 0 && (
        <div className="space-y-1.5">
          {completedGoals.map((g) => {
            const isActive = g.path_id === activePathId
            return (
              <StaggerItem key={g.path_id} variants={fadeUp({ y: 14 })}>
                <div className={rowCls(isActive, 'completed')}>
                  {isActive && (
                    <motion.span
                      layoutId="active-path-marker"
                      className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-success-500"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    onClick={() => handleActivate(g.path_id)}
                    disabled={isActive}
                    className="flex min-w-0 flex-1 items-center gap-3 pl-3 text-left focus:outline-none"
                    aria-pressed={isActive}
                    aria-label={`Switch to completed path ${g.role_label}`}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center text-success-500"
                      aria-hidden="true"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-medium ${
                          isActive ? 'text-success-700' : 'text-ink-300'
                        }`}
                      >
                        {g.role_label}
                      </span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-success-600">
                        Completed · 100%
                      </span>
                    </span>
                  </button>
                  {isActive && (
                    <Check className="mr-1 h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden="true" />
                  )}
                  <button
                    onClick={() => setDeleteTarget(g)}
                    disabled={totalGoals <= 1}
                    className="mr-1 shrink-0 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus-visible:ring-1 focus-visible:ring-danger-400"
                    aria-label={`Delete completed path ${g.role_label}`}
                    title={totalGoals <= 1 ? 'You need at least one learning path' : `Delete ${g.role_label} path`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </StaggerItem>
            )
          })}
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        destructive
        tag="Delete path"
        title={`Delete ${deleteTarget?.role_label || 'learning path'}?`}
        description="This permanently removes the path, its roadmap, progress, skills and badges. This cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete path
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-400">
          {deleteTarget?.status === 'active'
            ? `"${deleteTarget?.role_label}" will be removed from your learning paths.`
            : `The completed path "${deleteTarget?.role_label}" will be removed.`}
        </p>
      </Modal>
    </Stagger>
  )
}
