import PropTypes from'prop-types'
import { motion } from'framer-motion'
import { Inbox, ArrowRight } from'lucide-react'
import { cn } from'../../lib/utils'
import { EASE } from'../../lib/motion'

EmptyState.propTypes = {
 icon: PropTypes.elementType,
 title: PropTypes.string,
 description: PropTypes.string,
 action: PropTypes.node,
 className: PropTypes.string,
}

export function EmptyState({
 icon: Icon = Inbox,
 title ='Nothing here yet',
 description,
 action,
 className ='',
}) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3, ease: EASE }}
 className={cn(
'relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-line bg-surface/70 px-6 py-12 text-center',
 className
 )}
 >
 <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
 <Icon className="h-5 w-5" aria-hidden="true" />
 </div>
 <div className="relative">
 <h3 className="text-sm font-semibold text-ink">{title}</h3>
 {description && (
 <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-400">{description}</p>
 )}
 </div>
 {action && <div className="relative mt-2">{action}</div>}
 {!action && (
 <div className="relative text-ink-500" aria-hidden="true">
 <ArrowRight className="h-4 w-4" />
 </div>
 )}
 </motion.div>
 )
}
