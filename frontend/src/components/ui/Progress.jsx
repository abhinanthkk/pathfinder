import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { EASE } from '../../lib/motion'

const TONES = {
  gold: 'bg-primary-400',
  emerald: 'bg-emerald-400',
  sky: 'bg-sky-400',
  slate: 'bg-surface-400',
  gradient: 'bg-gradient-to-r from-primary-500 to-primary-300',
}

ProgressBar.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  tone: PropTypes.oneOf(['gold', 'emerald', 'sky', 'slate', 'gradient']),
  className: PropTypes.string,
  trackClass: PropTypes.string,
  delay: PropTypes.number,
}

export function ProgressBar({ value = 0, max = 100, tone = 'gold', className = '', trackClass = '', delay = 0 }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const fill = TONES[tone] || TONES.gold
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-800/80', trackClass, className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn('h-full rounded-full', fill)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      />
    </div>
  )
}

Ring.propTypes = {
  value: PropTypes.number,
  max: PropTypes.number,
  size: PropTypes.number,
  stroke: PropTypes.number,
  children: PropTypes.node,
  tone: PropTypes.oneOf(['gold', 'emerald', 'sky']),
}

export function Ring({ value = 0, max = 100, size = 96, stroke = 7, children, tone = 'gold' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct / 100)

  const strokeColor = {
    gold: '#facc15',
    emerald: '#34d399',
    sky: '#38bdf8',
  }[tone]

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(63,63,70,0.5)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}