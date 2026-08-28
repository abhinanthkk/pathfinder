import { forwardRef, useId } from 'react'
import PropTypes from 'prop-types'

export const Select = forwardRef(
  ({ label, id, error, options = [], placeholder, className = '', children, ...props }, ref) => {
    const autoId = useId()
    const selectId = id || autoId
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-surface-400">
            {label}
            {props.required && (
              <span className="ml-1 text-primary-400" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`h-9 w-full rounded-[6px] border border-surface-700 bg-surface-950/90 px-3 text-sm text-surface-100 transition-colors focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children ||
            options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
        {error && (
          <p className="mt-1.5 text-xs text-red-400 font-mono" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

Select.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.any, label: PropTypes.string })),
  placeholder: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
}


