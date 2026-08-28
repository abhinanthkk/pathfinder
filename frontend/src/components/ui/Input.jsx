import { forwardRef, useId } from 'react'
import PropTypes from 'prop-types'

const baseFieldClasses =
  'w-full rounded-[6px] border border-surface-700 bg-surface-950/90 px-3 text-sm text-surface-100 placeholder:text-surface-600 transition-colors focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-50'

const sizeClasses = {
  md: 'h-9 text-sm',
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
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-400">
            {label}
            {props.required && (
              <span className="ml-1 text-primary-400" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseFieldClasses} ${sizeClasses[size]} ${error ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-surface-500 font-mono">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-400 font-mono" role="alert">
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

