import PropTypes from 'prop-types'
import SplitLines from './motion/SplitLines'
import { cn } from '../../lib/utils'

/**
 * Editorial page header. The title reveals as a masked, line-by-line
 * headline (the Stagger Reveal signature), the description stays quiet, and
 * actions sit baseline-aligned on the right. Under-pinned by a hairline.
 */
PageHeader.propTypes = {
  title: PropTypes.node,
  titleAs: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  description: PropTypes.node,
  actions: PropTypes.node,
  tag: PropTypes.node,
  icon: PropTypes.elementType,
  breadcrumb: PropTypes.node,
  className: PropTypes.string,
}

export function PageHeader({ title, titleAs, description, actions, tag, icon: Icon, breadcrumb, className = '' }) {
  return (
    <header className={cn('flex flex-col gap-4 border-b border-surface-800/80 pb-7 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-4">
        {Icon && (
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-surface-800 bg-surface-900/70 text-primary-400 sm:flex">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          {breadcrumb ? (
            <div className="mb-2">{breadcrumb}</div>
          ) : tag ? (
            <p className="section-label mb-2 text-primary-400/80">{tag}</p>
          ) : null}
          {typeof title === 'string' ? (
            <SplitLines
              parts={[{ text: title }]}
              as={titleAs || 'h1'}
              className="text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl"
              mount
              delay={0.05}
            />
          ) : (
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-surface-400">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
      )}
    </header>
  )
}