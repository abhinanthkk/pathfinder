import { forwardRef, useId } from 'react'
import PropTypes from 'prop-types'

export const Select = forwardRef(
  ({ label, id, error, options = [], placeholder, className = '', children, ...props }, ref) => {
    const autoId = useId()
    const selectId = id || autoId
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-surface-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`h-10 w-full rounded-lg border border-surface-700 bg-surface-950 px-3 text-sm text-surface-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-60 ${error ? 'border-red-500/60 focus:ring-red-500' : ''} ${className}`}
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
          <p className="mt-1.5 text-xs text-red-400" role="alert">
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
  options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.any, label: PropTypes.string })),
  placeholder: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
}
