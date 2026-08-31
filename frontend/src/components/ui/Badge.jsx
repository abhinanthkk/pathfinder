import PropTypes from'prop-types'
import { cn } from'../../lib/utils'

const VARIANTS = {
 neutral:'bg-surface-secondary text-ink-400 border-line',
 primary:'bg-primary-50 text-primary-700 border-primary-100',
 success:'bg-success-50 text-success-700 border-success-100',
 warning:'bg-warning-50 text-warning-600 border-warning-100',
 danger:'bg-danger-50 text-danger-600 border-danger-100',
 info:'bg-accent-50 text-accent-700 border-accent-100',
}

Badge.propTypes = {
 variant: PropTypes.oneOf(Object.keys(VARIANTS)),
 className: PropTypes.string,
 children: PropTypes.node,
}

export function Badge({ variant ='neutral', className ='', children, ...props }) {
 const variantClass = VARIANTS[variant] || VARIANTS.neutral
 return (
 <span
 className={cn(
'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
 variantClass,
 className
 )}
 {...props}
 >
 {children}
 </span>
 )
}
