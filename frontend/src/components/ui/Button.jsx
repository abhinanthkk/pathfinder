import { forwardRef } from 'react'
import PropTypes from 'prop-types'

const VARIANTS = {
  primary:
    'bg-primary-400 text-surface-950 hover:bg-primary-300 active:bg-primary-500 font-semibold focus-visible:ring-primary-400 border border-primary-400 disabled:hover:bg-primary-400',
  secondary:
    'bg-surface-900 text-surface-200 border border-surface-700 hover:bg-surface-800 hover:border-surface-600 hover:text-white focus-visible:ring-surface-400',
  ghost:
    'bg-transparent text-surface-400 hover:bg-surface-850 hover:text-surface-100 focus-visible:ring-surface-400',
  outline:
    'bg-transparent text-surface-300 border border-surface-700 hover:border-surface-500 hover:text-white focus-visible:ring-surface-400',
  danger:
    'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400 disabled:hover:bg-red-600',
  'danger-soft':
    'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 focus-visible:ring-red-400',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs tracking-wide',
  md: 'h-9 px-4 text-sm font-medium',
  lg: 'h-11 px-6 text-sm font-semibold tracking-wide',
}

export const Button = forwardRef(
  ({ variant = 'primary', size = 'md', loading = false, children, className = '', disabled, ...props }, ref) => {
    const variantClass = VARIANTS[variant] || VARIANTS.primary
    const sizeClass = SIZES[size] || SIZES.md
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-[6px] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-950 ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {loading && (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
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
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'outline', 'danger', 'danger-soft']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
}

