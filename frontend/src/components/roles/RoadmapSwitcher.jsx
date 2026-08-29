import { useNavigate } from 'react-router-dom'
import { Plus, Check, Layers, CheckCircle2 } from 'lucide-react'
import useGoalsStore from '../../store/useGoalsStore'
import { useToast } from '../../context/ToastContext'

/**
 * Compact, reusable roadmap switcher. Used at the top of the Progress page
 * (and the Roadmap page) so the user can swap between their active learning
 * paths without a reload. Switching updates the global activePathId which all
 * data pages subscribe to.
 */
export function RoadmapSwitcher() {
  const navigate = useNavigate()
  const toast = useToast()
  const { goals, activePathId, status, activate, isMaxed } = useGoalsStore()

  const activeGoals = (goals || []).filter((g) => g.status === 'active')
  const completedGoals = (goals || []).filter((g) => g.status === 'completed')
  const maxed = isMaxed()

  const handleActivate = async (pathId) => {
    if (pathId === activePathId) return
    const before = activePathId
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
    }
  }

  return (
    <div className="rounded-[8px] border border-surface-800 bg-surface-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary-400">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          &gt; ACTIVE LEARNING PATH
          <span className="rounded-[3px] border border-surface-700 bg-surface-900 px-1.5 py-0.5 text-surface-400">
            {activeGoals.length} / 2
          </span>
        </div>
        {!maxed && (
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-1 rounded-[4px] border border-surface-700 px-2.5 py-1 font-mono text-[10px] text-surface-300 transition-all hover:border-primary-400/50 hover:text-primary-400"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Add Path
          </button>
        )}
      </div>

      {status === 'loading' && (
        <p className="py-1 font-mono text-[10px] text-surface-600">Loading paths…</p>
      )}

      {status !== 'loading' && activeGoals.length === 0 && completedGoals.length === 0 && (
        <button
          onClick={() => navigate('/onboarding')}
          className="flex w-full items-center gap-2 rounded-[6px] border border-dashed border-surface-700 px-3 py-2 text-left font-mono text-[10px] text-surface-400 transition-all hover:border-primary-400/50 hover:text-primary-400"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Create your first learning path
        </button>
      )}

      {activeGoals.length > 0 && (
        <div className="space-y-2">
          {activeGoals.map((g) => {
            const isActive = g.path_id === activePathId
            return (
              <button
                key={g.path_id}
                onClick={() => handleActivate(g.path_id)}
                disabled={isActive}
                className={`flex w-full items-center gap-3 rounded-[6px] border px-3 py-2.5 text-left transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${
                  isActive
                    ? 'border-primary-400/50 bg-primary-400/10'
                    : 'border-surface-700 bg-surface-950/40 hover:border-surface-600 hover:bg-surface-900'
                }`}
                aria-pressed={isActive}
                aria-label={`Switch to ${g.role_label}`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isActive ? 'bg-primary-400' : 'bg-surface-600'
                  }`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-medium ${
                      isActive ? 'text-primary-300' : 'text-surface-200'
                    }`}
                  >
                    {g.role_label}
                  </span>
                  <span className="block font-mono text-[10px] text-surface-500">
                    {Math.round(g.progress_percentage || 0)}% complete
                    {g.current_step_title ? ` · ${g.current_step_title}` : ''}
                  </span>
                </span>
                {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-primary-400" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="mt-2 space-y-2">
          {completedGoals.map((g) => {
            const isActive = g.path_id === activePathId
            return (
              <button
                key={g.path_id}
                onClick={() => handleActivate(g.path_id)}
                disabled={isActive}
                className={`flex w-full items-center gap-3 rounded-[6px] border px-3 py-2.5 text-left transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-surface-700 bg-surface-950/40 hover:border-emerald-500/40 hover:bg-surface-900'
                }`}
                aria-pressed={isActive}
                aria-label={`Switch to completed path ${g.role_label}`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-emerald-400" aria-hidden="true">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-medium ${
                      isActive ? 'text-emerald-300' : 'text-surface-300'
                    }`}
                  >
                    {g.role_label}
                  </span>
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-emerald-500">
                    Completed · 100%
                  </span>
                </span>
                {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}

      {maxed && (
        <p className="mt-2 px-1 font-mono text-[9px] text-surface-600">
          Max 2 active paths reached · manage in Profile
        </p>
      )}
    </div>
  )
}
