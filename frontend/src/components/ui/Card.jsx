import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

/**
 * Editorial card. Only used where grouping genuinely aids comprehension.
 * Visual weight is intentional, not uniform:
 *
 *  surface  quiet hairline pane (default)
 *  raised   stronger surface for primary content
 *  accent   the main focal card of a screen (e.g. Current Module)
 *  subtle   near-flat supporting content
 *
 * Interactive cards lift ~2px on hover with a whisper of shadow. Non-interactive
 * cards stay perfectly still.
 */
const VARIANTS = {
  surface: 'border border-surface-800/80 bg-surface-900/40',
  raised: 'border border-surface-700/80 bg-surface-900/70',
  accent:
    'border border-primary-400/30 bg-gradient-to-b from-primary-400/[0.07] to-transparent',
  subtle: 'border border-transparent bg-surface-900/20',
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  padded: PropTypes.bool,
  variant: PropTypes.oneOf(['surface', 'raised', 'accent', 'subtle']),
  interactive: PropTypes.bool,
}

export function Card({ children, className = '', padded = true, variant = 'surface', interactive = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[10px] transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out',
        VARIANTS[variant] || VARIANTS.surface,
        padded && 'p-5 sm:p-6',
        interactive &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-surface-600 hover:bg-surface-900/70 hover:shadow-subtle active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}