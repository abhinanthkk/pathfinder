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
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-12 text-center ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-400" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-surface-100">{title}</h3>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-surface-400">{description}</p>}
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-1"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}
