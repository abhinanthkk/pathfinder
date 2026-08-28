import PropTypes from 'prop-types'

const VARIANTS = {
  neutral: 'bg-surface-850 text-surface-400 border-surface-700',
  primary: 'bg-primary-500/10 text-primary-400 border-primary-500/30',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/10 text-red-400 border-red-500/30',
  info: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
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
      className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

