import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

/* eslint-disable react-refresh/only-export-components */

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-500/40',
    iconColor: 'text-emerald-400',
    label: 'Success',
  },
  error: {
    icon: AlertCircle,
    ring: 'border-red-500/40',
    iconColor: 'text-red-400',
    label: 'Error',
  },
  info: {
    icon: Info,
    ring: 'border-primary-500/40',
    iconColor: 'text-primary-400',
    label: 'Info',
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
        className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] || TOAST_STYLES.info
          const Icon = style.icon
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface-900/95 p-4 shadow-2xl backdrop-blur ${style.ring}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">
                  {style.label}
                </p>
                <p className="mt-0.5 text-sm text-surface-100">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-surface-500 transition-colors hover:text-surface-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
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
