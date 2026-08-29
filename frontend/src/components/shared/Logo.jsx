import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

Logo.propTypes = {
  to: PropTypes.string,
  compact: PropTypes.bool,
  className: PropTypes.string,
}

export function Logo({ to = '/', compact = false, className = '' }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400',
        className
      )}
      aria-label="Pathfinder home"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[9px] border border-surface-700 bg-gradient-to-b from-surface-800 to-surface-900 shadow-subtle transition-all duration-200 group-hover:border-primary-400/60">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M2 14L8 2L14 14L8 11.2L2 14Z"
            stroke="#FACC15"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute -inset-px rounded-[9px] ring-1 ring-inset ring-white/[0.04]" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-white transition-colors group-hover:text-primary-400">
            PATHFINDER
          </span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-surface-500">
            learning os
          </span>
        </span>
      )}
    </Link>
  )
}