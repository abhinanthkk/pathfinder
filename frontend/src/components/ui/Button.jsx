import { forwardRef } from'react'
import PropTypes from'prop-types'
import { cn } from'../../lib/utils'

const VARIANTS = {
 primary:
'bg-primary-600 text-white border border-transparent hover:bg-primary-700 active:bg-primary-800 shadow-emphasis',
 secondary:
'bg-surface text-ink-300 border border-line-strong hover:bg-primary-50 hover:border-primary-600 shadow-soft',
 ghost:
'bg-transparent text-ink-300 border border-transparent hover:bg-surface-secondary hover:text-ink',
 outline:
'bg-transparent text-ink-100 border border-line-strong hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50',
 danger:
'bg-danger-600 text-white border border-transparent hover:bg-danger-700 active:bg-danger-800',
'danger-soft':
'bg-danger-50 text-danger-600 border border-danger-100 hover:bg-danger-100 hover:text-danger-700',
}

const SIZES = {
 sm:'h-8 px-3 text-xs',
 md:'h-9 px-4 text-sm',
 lg:'h-11 px-6 text-sm font-semibold',
}

export const Button = forwardRef(
 ({ variant ='primary', size ='md', loading = false, children, className ='', disabled, ...props }, ref) => {
 const variantClass = VARIANTS[variant] || VARIANTS.primary
 const sizeClass = SIZES[size] || SIZES.md
 return (
 <button
 ref={ref}
 disabled={disabled || loading}
 data-loading={loading || undefined}
 className={cn(
'relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-lg transition-all duration-200 active:scale-[0.98]',
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

Button.displayName ='Button'

Button.propTypes = {
 variant: PropTypes.oneOf(['primary','secondary','ghost','outline','danger','danger-soft']),
 size: PropTypes.oneOf(['sm','md','lg']),
 loading: PropTypes.bool,
 disabled: PropTypes.bool,
 children: PropTypes.node,
 className: PropTypes.string,
}
