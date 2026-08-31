import PropTypes from'prop-types'
import SplitLines from'./motion/SplitLines'
import { cn } from'../../lib/utils'

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

export function PageHeader({ title, titleAs, description, actions, tag, icon: Icon, breadcrumb, className ='' }) {
 return (
 <header className={cn('flex flex-col gap-4 border-b border-line/60 pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
 <div className="flex min-w-0 items-start gap-4">
 {Icon && (
 <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/10 text-primary-600 sm:flex">
 <Icon className="h-5 w-5" aria-hidden="true" />
 </div>
 )}
 <div className="min-w-0">
 {breadcrumb ? (
 <div className="mb-2">{breadcrumb}</div>
 ) : tag ? (
 <p className="tech-label mb-2 text-primary-600">{tag}</p>
 ) : null}
 {typeof title ==='string' ? (
 <SplitLines
 parts={[{ text: title }]}
 as={titleAs ||'h1'}
 className="text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl"
 mount
 delay={0.05}
 />
 ) : (
 <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl">
 {title}
 </h1>
 )}
 {description && (
 <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink-400">{description}</p>
 )}
 </div>
 </div>
 {actions && (
 <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
 )}
 </header>
 )
}
