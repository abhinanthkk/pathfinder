import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import PropTypes from 'prop-types'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './Button'
import { cn } from '../../lib/utils'

Modal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.node,
  tag: PropTypes.string,
  description: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  destructive: PropTypes.bool,
}

/**
 * Editorial modal. Opens calm (scale 0.98 → 1 with a small rise), closes
 * faster than it opens. Backdrop fades; invisible overlay regions never block
 * clicks. Destructive dialogs take a quiet red accent on the header label.
 */
export function Modal({
  open,
  onClose,
  title,
  tag,
  description,
  children,
  footer,
  size = 'md',
  destructive = false,
}) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)
  const titleId = useId()

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  useEffect(() => {
    if (!open) return undefined

    previouslyFocused.current = document.activeElement

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    const focusables = panelRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusables?.length) {
      setTimeout(() => focusables[0].focus(), 10)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus?.()
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.3, 0.4, 0.2, 1] }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={cn(
              'relative w-full overflow-hidden rounded-[14px] border border-surface-700 bg-surface-925 shadow-panel',
              'max-h-[90vh] overflow-y-auto',
              sizeClasses[size]
            )}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-surface-600/60 to-transparent"
              aria-hidden="true"
            />
            <div className="flex items-start justify-between gap-4 border-b border-surface-800 px-6 pb-4 pt-5">
              <div className="min-w-0">
                {tag && (
                  <p
                    className={cn(
                      'section-label mb-1',
                      destructive ? 'text-red-400' : 'text-primary-400'
                    )}
                  >
                    {tag}
                  </p>
                )}
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
                  {title}
                </h2>
                {description && <p className="mt-1 text-sm leading-relaxed text-surface-400">{description}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="shrink-0">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="px-6 py-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-3 border-t border-surface-800 bg-surface-900/40 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}