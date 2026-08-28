import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'

Logo.propTypes = {
  to: PropTypes.string,
  compact: PropTypes.bool,
  className: PropTypes.string,
}

export function Logo({ to = '/', compact = false, className = '' }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400 ${className}`}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-surface-700 bg-surface-900 transition-colors group-hover:border-primary-400/70">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            d="M2 14L8 2L14 14L8 11.2L2 14Z"
            stroke="#FACC15"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-white transition-colors group-hover:text-primary-400">
          PATHFINDER
        </span>
      )}
    </Link>
  )
}

