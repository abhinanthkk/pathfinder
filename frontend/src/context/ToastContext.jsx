import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

/* eslint-disable react-refresh/only-export-components */

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    label: 'DONE',
  },
  error: {
    icon: AlertCircle,
    ring: 'border-red-500/30',
    iconColor: 'text-red-400',
    label: 'ERROR',
  },
  info: {
    icon: Info,
    ring: 'border-primary-400/30',
    iconColor: 'text-primary-400',
    label: 'PATHFINDER',
  },
}

let toastId = 0

ToastProvider.propTypes = {
  children: PropTypes.node,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAfter = useCallback(
    (id, duration) => {
      const existing = timers.current.get(id)
      if (existing) clearTimeout(existing)
      if (duration) {
        const t = setTimeout(() => dismiss(id), duration)
        timers.current.set(id, t)
      }
    },
    [dismiss]
  )

  const push = useCallback(
    (type, message, { duration = 4200 } = {}) => {
      const id = ++toastId
      setToasts((prev) => [...prev.slice(-4), { id, type, message }])
      dismissAfter(id, duration)
    },
    [dismissAfter]
  )

  const toast = useMemo(
    () => ({
      success: (message, opts) => push('success', message, opts),
      error: (message, opts) => push('error', message, opts),
      info: (message, opts) => push('info', message, opts),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const style = TOAST_STYLES[t.type] || TOAST_STYLES.info
            const Icon = style.icon
            return (
              <motion.div
                key={t.id}
                role="status"
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-[10px] border bg-surface-925/95 p-3.5 pr-10 shadow-panel backdrop-blur-md ${style.ring}`}
              >
                <span className={`mt-0.5 shrink-0 ${style.iconColor}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="section-label text-surface-500">{style.label}</p>
                  <p className="mt-0.5 text-xs leading-snug text-surface-100">{t.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="absolute right-1.5 top-1.5 rounded p-1 text-surface-500 transition-colors hover:text-surface-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}