import { forwardRef, useId } from 'react'
import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

export const Select = forwardRef(
  ({ label, id, error, options = [], placeholder, className = '', children, ...props }, ref) => {
    const autoId = useId()
    const selectId = id || autoId
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-[13px] font-medium text-ink-200">
            {label}
            {props.required && (
              <span className="ml-1 text-primary-600" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-10 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm text-ink transition-colors focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-50 shadow-soft',
            error ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-100' : '',
            className
          )}
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
          <p className="mt-1.5 text-xs text-danger-600" role="alert">
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
