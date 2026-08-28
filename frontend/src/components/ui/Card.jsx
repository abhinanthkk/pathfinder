import PropTypes from 'prop-types'

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  padded: PropTypes.bool,
}

export function Card({ children, className = '', padded = true, ...props }) {
  return (
    <div
      className={`rounded-[8px] border border-surface-800 bg-surface-900/70 ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

