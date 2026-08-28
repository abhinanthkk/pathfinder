import PropTypes from 'prop-types'

const VARIANTS = {
  neutral: 'bg-surface-800 text-surface-300 border-surface-700',
  primary: 'bg-primary-500/15 text-primary-300 border-primary-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-300 border-red-500/30',
  info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
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
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
