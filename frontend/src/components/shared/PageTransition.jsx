import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

/**
 * Mount-based editorial entrance for a page's content block. Fades in with a
 * small rise; inner child sections add their own staggered reveals on top.
 * The App-level page shell already handles route enter/exit — this keeps the
 * content from compounding motion.
 */
export function PageTransition({ children, className = '', delay = 0, y = 12 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

PageTransition.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  delay: PropTypes.number,
  y: PropTypes.number,
}