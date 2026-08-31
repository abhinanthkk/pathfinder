import { forwardRef, useId } from 'react'
import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

const baseFieldClasses =
  'w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-500 transition-colors focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-50 shadow-soft'

const sizeClasses = {
  md: 'h-10 text-sm',
  lg: 'h-11 text-sm',
}

export const Input = forwardRef(
  ({ label, id, error, hint, size = 'md', className = '', ...props }, ref) => {
    const autoId = useId()
    const inputId = id || autoId
    const describedBy = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-ink-200">
            {label}
            {props.required && (
              <span className="ml-1 text-primary-600" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            baseFieldClasses,
            sizeClasses[size],
            error ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-100' : '',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger-600" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

Input.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  error: PropTypes.string,
  hint: PropTypes.string,
  size: PropTypes.oneOf(['md', 'lg']),
  required: PropTypes.bool,
  className: PropTypes.string,
}
