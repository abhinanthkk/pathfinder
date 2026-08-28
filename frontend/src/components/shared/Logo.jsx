import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { Compass } from 'lucide-react'

Logo.propTypes = {
  to: PropTypes.string,
  compact: PropTypes.bool,
}

export function Logo({ to = '/', compact = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-lg">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700">
        <Compass className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      {!compact && <span className="text-lg font-bold tracking-tight text-white">Pathfinder</span>}
    </Link>
  )
}
