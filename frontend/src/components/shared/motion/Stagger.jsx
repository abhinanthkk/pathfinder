import PropTypes from 'prop-types'
import { motion, useReducedMotion } from 'framer-motion'
import { STAGGER } from '../../../lib/motion'
import { cn } from '../../../lib/utils'

/**
 * Editorial stagger container. Orchestrates children so they fade up in
 * sequence — the signature Motion-UI hero beat, applied to every surface.
 *
 * - Entrance on first view (once) by default; pass `mount` to animate on
 *   mount instead (useful inside mounted vs-in-view hierarchies).
 * - Respects `prefers-reduced-motion` ("calm"): travel is removed, a soft
 *   opacity cross-fade remains.
 */
function Stagger({
  children,
  className = '',
  as = 'div',
  staggerChildren = STAGGER.base,
  delayChildren = 0,
  once = true,
  amount = 0.35,
  mount = false,
  ...props
}) {
  const reduced = useReducedMotion()

  const Tag = motion[as === 'section' ? 'section' : as === 'ul' || as === 'ol' ? as : 'div']

  const hidden = {}
  const show = {
    transition: {
      delayChildren,
      staggerChildren: reduced ? 0 : staggerChildren,
    },
  }

  return (
    <Tag
      className={cn(className)}
      initial={reduced ? undefined : 'hidden'}
      whileInView={mount ? undefined : 'show'}
      animate={mount ? 'show' : undefined}
      viewport={once ? { once: true, amount } : { amount }}
      variants={{ hidden, show }}
      {...props}
    >
      {children}
    </Tag>
  )
}

Stagger.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  staggerChildren: PropTypes.number,
  delayChildren: PropTypes.number,
  once: PropTypes.bool,
  amount: PropTypes.number,
  mount: PropTypes.bool,
}

export default Stagger