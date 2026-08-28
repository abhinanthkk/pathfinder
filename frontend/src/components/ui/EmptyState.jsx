import PropTypes from 'prop-types'
import { Inbox } from 'lucide-react'

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
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-[8px] border border-surface-800 bg-surface-900/40 px-6 py-12 text-center ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-surface-700 bg-surface-850">
        <Icon className="h-5 w-5 text-surface-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-surface-200">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs text-surface-500 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

