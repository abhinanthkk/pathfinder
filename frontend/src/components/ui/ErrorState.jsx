import PropTypes from 'prop-types'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

ErrorState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  onRetry: PropTypes.func,
  className: PropTypes.string,
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, className = '' }) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-[8px] border border-red-500/30 bg-red-500/5 px-6 py-10 text-center ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-red-500/30 bg-red-500/10">
        <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-surface-100">{title}</h3>
        {description && <p className="mx-auto mt-1 max-w-sm text-xs text-surface-400 leading-relaxed">{description}</p>}
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-2"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}

