import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

/**
 * Smoothly counts from 0 to `value` on mount (and whenever `value` changes).
 * Purely presentational.
 */
export function CountUp({ value = 0, duration = 900, className = '', format }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()
    const from = 0
    const to = value
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  const text = format ? format(display) : String(display)

  return <span className={`stat-number ${className}`}>{text}</span>
}

CountUp.propTypes = {
  value: PropTypes.number,
  duration: PropTypes.number,
  className: PropTypes.string,
  format: PropTypes.func,
}