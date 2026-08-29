import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { Inbox, ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { EASE } from '../../lib/motion'

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  description: PropTypes.string,
  action: PropTypes.node,
  className: PropTypes.string,
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[10px] border border-dashed border-surface-800 px-6 py-12 text-center',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_220px_at_50%_0%,rgba(250,204,21,0.04),transparent)]"
        aria-hidden="true"
      />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-[10px] border border-surface-700 bg-surface-900 text-primary-400/90">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="relative">
        <h3 className="text-sm font-semibold text-surface-200">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-surface-500">{description}</p>
        )}
      </div>
      {action && <div className="relative mt-2">{action}</div>}
      {!action && (
        <div className="relative text-surface-600" aria-hidden="true">
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  )
}