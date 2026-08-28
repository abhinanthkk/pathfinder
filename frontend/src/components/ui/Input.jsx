import { forwardRef, useId } from 'react'
import PropTypes from 'prop-types'

const baseFieldClasses =
  'w-full rounded-lg border border-surface-700 bg-surface-950 px-3 text-sm text-surface-100 placeholder:text-surface-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-60'

const sizeClasses = {
  md: 'h-10',
  lg: 'h-12',
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
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-surface-300">
            {label}
            {props.required && (
              <span className="ml-0.5 text-red-400" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseFieldClasses} ${sizeClasses[size]} ${error ? 'border-red-500/60 focus:ring-red-500' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-surface-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-400" role="alert">
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
