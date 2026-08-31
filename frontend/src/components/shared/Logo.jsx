import { Link } from'react-router-dom'
import PropTypes from'prop-types'
import { cn } from'../../lib/utils'

Logo.propTypes = {
 to: PropTypes.string,
 compact: PropTypes.bool,
 className: PropTypes.string,
}

export function Logo({ to ='/', compact = false, className ='' }) {
 return (
 <Link
 to={to}
 className={cn(
'group inline-flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-400',
 className
 )}
 aria-label="Pathfinder home"
 >
 <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 shadow-emphasis transition-transform duration-200 group-hover:scale-105">
 <svg
 viewBox="0 0 16 16"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className="h-4.5 w-4.5"
 aria-hidden="true"
 >
 <path
 d="M2 14L8 2L14 14L8 11.2L2 14Z"
 stroke="#FFFFFF"
 strokeWidth="1.5"
 strokeLinejoin="round"
 />
 </svg>
 </span>
 {!compact && (
 <span className="flex flex-col leading-none">
 <span className="text-[15px] font-semibold tracking-tight text-ink transition-colors group-hover:text-primary-700">
 Pathfinder
 </span>
 <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">
 Learning
 </span>
 </span>
 )}
 </Link>
 )
}
