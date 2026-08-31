import { useEffect } from 'react'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Check } from 'lucide-react'
import useGoalsStore from '../../store/useGoalsStore'
import { useToast } from '../../context/ToastContext'

RoleSwitcher.propTypes = {
  expanded: PropTypes.bool,
  onExpand: PropTypes.func,
}

const tooltipCls =
  'pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink shadow-card opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100'

/**
 * Sidebar role switcher. Shows the user's active learning roles and lets them
 * switch which one is current. Collapses to a single icon on the icon rail.
 */
export function RoleSwitcher({ expanded, onExpand }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { goals, activePathId, status, fetchGoals, activate } = useGoalsStore()

  useEffect(() => {
    if (goals.length === 0 && status === 'idle') {
      fetchGoals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleActivate = async (pathId) => {
    if (pathId === activePathId) return
    const before = activePathId
    try {
      const res = await activate(pathId)
      if (res.ok) {
        toast.success('Switched learning role.')
      } else {
        toast.error('Failed to switch role.')
        if (before) useGoalsStore.setState({ activePathId: before })
      }
    } catch {
      toast.error('Failed to switch role.')
      if (before) useGoalsStore.setState({ activePathId: before })
    }
  }

  if (!expanded) {
    return (
      <div className="shrink-0 px-2 pb-2">
        <button
          onClick={onExpand}
          className="group relative flex h-9 w-full items-center justify-center rounded-lg border border-line-strong bg-surface text-ink-400 transition-all hover:border-primary-300 hover:text-primary-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
          aria-label="Switch learning role"
          title="Switch learning role"
        >
          <Layers className="h-4 w-4" aria-hidden="true" />
          <span className={tooltipCls}>Switch Role</span>
        </button>
        <span className="sr-only">Switch learning role</span>
      </div>
    )
  }

  return (
    <div className="shrink-0 border-t border-line bg-surface-secondary p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="section-label text-ink-400">Learning roles</p>
        {status !== 'loading' && (
          <span className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-ink-400">
            {goals.filter((g) => g.status === 'active').length}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {status === 'loading' && (
          <p className="px-1 py-1 text-[10px] text-ink-400">Loading roles…</p>
        )}

        {status !== 'loading' &&
          goals.filter((g) => g.status === 'active').length === 0 && (
            <button
              onClick={() => navigate('/onboarding')}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line-strong px-2.5 py-2 text-left text-xs text-ink-400 transition-all hover:border-primary-300 hover:text-primary-700"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Add first learning role
            </button>
          )}

        {goals.map((g) => {
          const isActive = g.path_id === activePathId
          return (
            <button
              key={g.path_id}
              onClick={() => handleActivate(g.path_id)}
              disabled={isActive}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${
                isActive
                  ? 'border border-primary-200 bg-primary-50'
                  : 'border border-transparent hover:border-line hover:bg-surface'
              }`}
              aria-label={`Switch to ${g.role_label}`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  isActive ? 'bg-primary-600' : 'bg-line-strong'
                }`}
                aria-hidden="true"
              />
              <span
                className={`min-w-0 flex-1 truncate text-xs ${
                  isActive ? 'font-medium text-primary-700' : 'text-ink-300'
                }`}
              >
                {g.role_label}
              </span>
              <span className="shrink-0 text-[10px] font-medium text-ink-400">
                {g.status === 'completed' ? '✓ 100%' : `${Math.round(g.progress_percentage || 0)}%`}
              </span>
              {isActive && <Check className="h-3 w-3 shrink-0 text-primary-600" aria-hidden="true" />}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => navigate('/onboarding')}
        className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[10px] font-semibold text-ink-400 transition-all hover:text-primary-700"
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
        Add another role
      </button>
    </div>
  )
}
