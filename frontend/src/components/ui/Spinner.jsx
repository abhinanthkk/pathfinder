import PropTypes from'prop-types'

Spinner.propTypes = {
 label: PropTypes.string,
 className: PropTypes.string,
}

export function Spinner({ label ='Loading…', className ='' }) {
 return (
 <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 ${className}`}>
 <span
 className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-primary-600"
 aria-hidden="true"
 />
 {label && <span className="text-xs font-medium tracking-wide text-ink-400">{label}</span>}
 </div>
 )
}
