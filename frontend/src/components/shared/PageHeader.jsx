import PropTypes from 'prop-types'

PageHeader.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  actions: PropTypes.node,
  tag: PropTypes.string,
  icon: PropTypes.elementType,
}

export function PageHeader({ title, description, actions, tag, icon: Icon }) {
  return (
    <div className="flex flex-col gap-4 border-b border-surface-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-surface-700 bg-surface-900 sm:flex">
            <Icon className="h-5 w-5 text-primary-400" aria-hidden="true" />
          </div>
        )}
        <div>
          {tag && (
            <p className="mb-1 font-mono text-[11px] font-medium uppercase tracking-widest text-primary-400">
              {tag}
            </p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-surface-400">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  )
}

