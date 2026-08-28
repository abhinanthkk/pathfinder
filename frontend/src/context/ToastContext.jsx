import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

/* eslint-disable react-refresh/only-export-components */

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-500/40 bg-surface-900/95 text-emerald-400',
    iconColor: 'text-emerald-400',
    label: 'SUCCESS',
  },
  error: {
    icon: AlertCircle,
    ring: 'border-red-500/40 bg-surface-900/95 text-red-400',
    iconColor: 'text-red-400',
    label: 'ERROR',
  },
  info: {
    icon: Info,
    ring: 'border-primary-400/40 bg-surface-900/95 text-primary-400',
    iconColor: 'text-primary-400',
    label: 'SYSTEM INFO',
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
    (type, message, { duration = 5000 } = {}) => {
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
        className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] || TOAST_STYLES.info
          const Icon = style.icon
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-[6px] border p-3.5 shadow-2xl backdrop-blur-md ${style.ring}`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                  {style.label}
                </p>
                <p className="mt-0.5 text-xs text-surface-100 leading-snug">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-[4px] p-1 text-surface-500 transition-colors hover:text-surface-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )
        })}
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

