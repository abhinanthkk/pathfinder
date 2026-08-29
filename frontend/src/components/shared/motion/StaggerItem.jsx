import PropTypes from 'prop-types'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE, DURATION, TRAVEL } from '../../../lib/motion'
import { cn } from '../../../lib/utils'

/**
 * Single editorial item inside a <Stagger> container. Fades up with the
 * signature easing. Reduced-motion users get a pure opacity cross-fade.
 */
function StaggerItem({
  children,
  className = '',
  as = 'div',
  y = TRAVEL.enter,
  duration = DURATION.section,
  delay = 0,
  ...props
}) {
  const reduced = useReducedMotion()

  const Tag = motion[as === 'li' ? 'li' : as === 'tr' ? 'tr' : 'div']

  return (
    <Tag
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : y },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration, delay, ease: EASE },
        },
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}

StaggerItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  y: PropTypes.number,
  duration: PropTypes.number,
  delay: PropTypes.number,
}

export default StaggerItem