import PropTypes from'prop-types'
import { cn } from'../../lib/utils'

const VARIANTS = {
 surface:'border border-line bg-surface shadow-card',
 raised:'border border-line-strong bg-surface shadow-raised',
 accent:
'border border-primary-100 bg-gradient-to-b from-primary-50/80 to-white shadow-card',
 subtle:'border border-transparent bg-surface-secondary',
}

Card.propTypes = {
 children: PropTypes.node,
 className: PropTypes.string,
 padded: PropTypes.bool,
 variant: PropTypes.oneOf(['surface','raised','accent','subtle']),
 interactive: PropTypes.bool,
}

export function Card({ children, className ='', padded = true, variant ='surface', interactive = false, ...props }) {
 return (
 <div
 className={cn(
'rounded-xl transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out',
 VARIANTS[variant] || VARIANTS.surface,
 padded &&'p-5 sm:p-6',
 interactive &&
'cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover hover:border-line-strong active:scale-[0.99]',
 className
 )}
 {...props}
 >
 {children}
 </div>
 )
}
