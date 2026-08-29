import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

/**
 * Quiet editorial section heading. An overline label, an optional trailing
 * annotation, and a hairline rule that gives the section editorial pacing.
 */
SectionHeading.propTypes = {
  icon: PropTypes.elementType,
  children: PropTypes.node,
  as: PropTypes.elementType,
  prefix: PropTypes.string,
  trailing: PropTypes.node,
  className: PropTypes.string,
}

export function SectionHeading({
  icon: Icon,
  children,
  as: Tag = 'h2',
  prefix,
  trailing,
  className = '',
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {Icon && (
        <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-surface-800 bg-surface-850/80 text-primary-400">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
      {prefix && <span className="font-mono text-primary-400" aria-hidden="true">{prefix}</span>}
      <Tag className="section-label text-surface-400">{children}</Tag>
      <span
        className="h-px flex-1 bg-gradient-to-r from-surface-800 to-transparent"
        aria-hidden="true"
      />
      {trailing}
    </div>
  )
}