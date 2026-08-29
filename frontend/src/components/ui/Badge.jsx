import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

const VARIANTS = {
  neutral: 'bg-surface-800/70 text-surface-400 border-surface-700/70',
  primary: 'bg-primary-400/10 text-primary-300 border-primary-400/25',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  danger: 'bg-red-500/10 text-red-400 border-red-500/25',
  info: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
}

Badge.propTypes = {
  variant: PropTypes.oneOf(Object.keys(VARIANTS)),
  className: PropTypes.string,
  children: PropTypes.node,
}

export function Badge({ variant = 'neutral', className = '', children, ...props }) {
  const variantClass = VARIANTS[variant] || VARIANTS.neutral
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        variantClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}