import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import PropTypes from 'prop-types'
import { Button } from './Button'

Modal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  title: PropTypes.node,
  tag: PropTypes.string,
  description: PropTypes.node,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
}

export function Modal({
  open,
  onClose,
  title,
  tag,
  description,
  children,
  footer,
  size = 'md',
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

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-[10px] border border-surface-700 bg-surface-900 p-6 shadow-2xl`}
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-surface-800 pb-4">
          <div>
            {tag && (
              <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-widest text-primary-400">
                {tag}
              </p>
            )}
            <h2 id={titleId} className="text-lg font-semibold text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-surface-400">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-3 border-t border-surface-800 pt-4">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

