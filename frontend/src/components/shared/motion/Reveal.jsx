import PropTypes from 'prop-types'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE, DURATION, TRAVEL } from '../../../lib/motion'

/**
 * Fade-up reveal for a single element on first view (or on mount).
 * The quiet counterpart to <Stagger>: one piece of content, gently surfaced.
 */
function Reveal({
  children,
  className = '',
  delay = 0,
  y = TRAVEL.enter,
  duration = DURATION.section,
  mount = false,
  as = 'div',
  once = true,
  amount = 0.3,
}) {
  const reduced = useReducedMotion()
  const Tag = motion[as]

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={mount ? undefined : { opacity: 1, y: 0 }}
      animate={mount ? { opacity: 1, y: 0 } : undefined}
      viewport={once ? { once: true, amount } : { amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}

Reveal.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  delay: PropTypes.number,
  y: PropTypes.number,
  duration: PropTypes.number,
  mount: PropTypes.bool,
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  once: PropTypes.bool,
  amount: PropTypes.number,
}

export default Reveal