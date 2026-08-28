import PropTypes from 'prop-types'

Skeleton.propTypes = {
  className: PropTypes.string,
}

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-[4px] bg-surface-850 ${className}`}
      aria-hidden="true"
    />
  )
}

SkeletonCard.propTypes = {
  className: PropTypes.string,
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-[8px] border border-surface-800 bg-surface-900/60 p-5 ${className}`}>
      <Skeleton className="mb-3 h-3.5 w-1/3" />
      <Skeleton className="mb-2 h-7 w-2/3" />
      <Skeleton className="h-3.5 w-1/2" />
    </div>
  )
}

