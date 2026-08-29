import PropTypes from 'prop-types'

Spinner.propTypes = {
  label: PropTypes.string,
  className: PropTypes.string,
}

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-surface-700 border-t-primary-400"
        aria-hidden="true"
      />
      {label && <span className="text-xs tracking-wide text-surface-400 uppercase font-mono">{label}</span>}
    </div>
  )
}