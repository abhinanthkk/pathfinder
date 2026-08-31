import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Layers, Plus, Check } from 'lucide-react'
import useGoalsStore from '../../store/useGoalsStore'
import { useToast } from '../../context/ToastContext'
import { cn } from '../../lib/utils'
import { EASE } from '../../lib/motion'

/**
 * Global learning-path selector, lives in the shell top bar.
 *
 * Shows the active roadmap (role + progress) and opens a quiet dropdown with
 * every learning path, the current one checked. Switching paths updates the
 * global activePathId which all data pages subscribe to. An "Add learning
 * path" row routes to onboarding.
 */
PathPicker.propTypes = {
  align: PropTypes.oneOf(['start', 'end']),
  className: PropTypes.string,
}

export function PathPicker({ align = 'end', className = '' }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { goals, activePathId, status, fetchGoals, activate } = useGoalsStore()
  const [open, setOpen] = useState(false)
  const [switchingId, setSwitchingId] = useState(null)
  const rootRef = useRef(null)

  const goalRows = (goals || []).filter((g) => g.status === 'active' || g.status === 'completed')

  useEffect(() => {
    if ((goals || []).length === 0 && status === 'idle') {
      fetchGoals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const active = goalRows.find((g) => g.path_id === activePathId)
  const activePct = active ? Math.round(active.progress_percentage || 0) : 0

  const handleSwitch = async (pathId) => {
    if (pathId === activePathId) {
      setOpen(false)
      return
    }
    const before = activePathId
    setSwitchingId(pathId)
    try {
      const res = await activate(pathId)
      if (res.ok) {
        toast.success('Switched learning path.')
      } else if (before) {
        useGoalsStore.setState({ activePathId: before })
      }
    } catch {
      if (before) useGoalsStore.setState({ activePathId: before })
    } finally {
      setSwitchingId(null)
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'group flex h-9 items-center gap-2 rounded-lg border border-line-strong bg-surface pl-1.5 pr-2.5 text-left shadow-soft',
          'transition-colors hover:border-line focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400',
          open && 'border-primary-300'
        )}
      >
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold',
            active
              ? 'border-primary-200 bg-primary-50 text-primary-700'
              : 'border-line bg-surface-secondary text-ink-400'
          )}
        >
          {active ? (
            active.role_label?.charAt(0).toUpperCase() || '?'
          ) : (
            <Layers className="h-3 w-3" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block max-w-40 truncate text-[13px] font-medium leading-tight text-ink">
            {active?.role_label || 'Create learning path'}
          </span>
          <span className="block text-[9px] leading-tight text-ink-400">
            {active
              ? active.status === 'completed'
                ? 'Completed · 100%'
                : `${activePct}% complete`
              : 'Start your first roadmap'}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform duration-200',
            open && 'rotate-180 text-primary-600'
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
            className={cn(
              'absolute top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-raised',
              align === 'start' ? 'left-0' : 'right-0'
            )}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-xs font-medium text-ink">Learning paths</span>
              {status === 'loading' ? (
                <span className="text-[10px] text-ink-400">loading…</span>
              ) : (
                <span className="text-[10px] text-ink-400">
                  {goalRows.length} {goalRows.length === 1 ? 'path' : 'paths'}
                </span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto py-1.5">
              {status !== 'loading' && goalRows.length === 0 && (
                <p className="px-4 py-3 text-xs text-ink-400">
                  No learning paths yet. Create your first one to get started.
                </p>
              )}

              {goalRows.map((g) => {
                const isActive = g.path_id === activePathId
                const isSwitching = switchingId === g.path_id
                const completed = g.status === 'completed'
                return (
                  <button
                    key={g.path_id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSwitch(g.path_id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-primary-50 focus:outline-none focus-visible:bg-primary-50',
                      isActive ? 'bg-primary-50/60' : ''
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        isActive ? 'bg-primary-600' : completed ? 'bg-success-500' : 'bg-line-strong'
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-xs font-medium',
                          isActive ? 'text-primary-700' : 'text-ink'
                        )}
                      >
                        {g.role_label}
                      </span>
                      <span className="block truncate text-[9px] text-ink-400">
                        {completed
                          ? 'Completed'
                          : g.current_step_title
                            ? `Now: ${g.current_step_title}`
                            : `${Math.round(g.progress_percentage || 0)}%`}
                      </span>
                    </span>
                    {isSwitching ? (
                      <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-line-strong border-t-primary-600" aria-hidden="true" />
                    ) : isActive ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden="true" />
                    ) : null}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/onboarding')
              }}
              className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:bg-primary-50"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Add learning path
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
