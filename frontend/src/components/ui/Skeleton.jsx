import PropTypes from 'prop-types'

Skeleton.propTypes = {
  className: PropTypes.string,
}

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-800 ${className}`}
      aria-hidden="true"
    />
  )
}

SkeletonCard.propTypes = {
  className: PropTypes.string,
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-2xl border border-surface-800 bg-surface-900 p-5 ${className}`}>
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
