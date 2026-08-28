import { forwardRef } from 'react'
import PropTypes from 'prop-types'

const VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-500 focus-visible:ring-primary-400 disabled:hover:bg-primary-600',
  secondary:
    'bg-surface-800 text-surface-200 border border-surface-700 hover:bg-surface-700 focus-visible:ring-surface-400',
  ghost:
    'bg-transparent text-surface-300 hover:bg-surface-800 hover:text-surface-100 focus-visible:ring-surface-400',
  danger:
    'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400 disabled:hover:bg-red-600',
  'danger-soft':
    'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 focus-visible:ring-red-400',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
}

export const Button = forwardRef(
  ({ variant = 'primary', size = 'md', loading = false, children, className = '', disabled, ...props }, ref) => {
    const variantClass = VARIANTS[variant] || VARIANTS.primary
    const sizeClass = SIZES[size] || SIZES.md
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950 ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {loading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger', 'danger-soft']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
}
