import PropTypes from 'prop-types'

Spinner.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
}

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      {label && <span className="text-sm text-surface-400">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  )
}
