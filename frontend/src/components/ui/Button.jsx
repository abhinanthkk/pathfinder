import { forwardRef } from 'react'
import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

/**
 * Editorial button. One motion vocabulary across the product:
 *
 *  hover   subtle surface lift + shadow
 *  active  scale 0.98 (immediate, no layout shift)
 *  loading preserves width (spinner replaces the icon slot)
 *  focus   visible gold ring
 */
const VARIANTS = {
  primary:
    'bg-primary-400 text-surface-950 font-semibold border border-transparent hover:bg-primary-300 active:bg-primary-500 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] hover:shadow-[0_6px_20px_-8px_rgba(250,204,21,0.5)]',
  secondary:
    'bg-surface-800/70 text-surface-100 border border-surface-700 hover:bg-surface-750 hover:border-surface-600 hover:text-white',
  ghost:
    'bg-transparent text-surface-400 border border-transparent hover:bg-surface-800/70 hover:text-surface-100',
  outline:
    'bg-transparent text-surface-200 border border-surface-700 hover:border-surface-500 hover:bg-surface-850/60 hover:text-white',
  danger:
    'bg-red-600/90 text-white border border-red-500/40 hover:bg-red-500 hover:border-red-500',
  'danger-soft':
    'bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/[0.16] hover:text-red-300',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-sm font-semibold',
}

export const Button = forwardRef(
  ({ variant = 'primary', size = 'md', loading = false, children, className = '', disabled, ...props }, ref) => {
    const variantClass = VARIANTS[variant] || VARIANTS.primary
    const sizeClass = SIZES[size] || SIZES.md
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        data-loading={loading || undefined}
        className={cn(
          'relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-[8px] transition-all duration-150 active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none',
          variantClass,
          sizeClass,
          className
        )}
        {...props}
      >
        {loading && (
          <span
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
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