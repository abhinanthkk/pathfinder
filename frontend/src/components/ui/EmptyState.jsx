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
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-800 bg-surface-900/50 px-6 py-14 text-center ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-800">
        <Icon className="h-7 w-7 text-surface-500" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-surface-200">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-surface-500">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
