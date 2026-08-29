import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

Skeleton.propTypes = {
  className: PropTypes.string,
}

export function Skeleton({ className = '' }) {
  return <div className={cn('skeleton-shimmer', className)} aria-hidden="true" />
}

SkeletonCard.propTypes = {
  className: PropTypes.string,
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`space-y-4 ${className}`} aria-hidden="true">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

HeroSkeleton.propTypes = {
  className: PropTypes.string,
}

/**
 * A composed "page in progress" skeleton for primary hero sections. Fades
 * smoothly into real content because the real cards reveal with the same
 * structure and spacing.
 */
export function HeroSkeleton({ className = '' }) {
  return (
    <div className={`space-y-5 ${className}`} aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-2.5 w-full" />
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

/**
 * Dashboard skeleton — mirrors the editorial dashboard composition:
 * header, active-path banner, then progress + current module + streak row,
 * then lower sections.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-2.5 w-64" />
        </div>
        <Skeleton className="hidden h-8 w-28 sm:block" />
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  )
}

/**
 * Progress page skeleton — summary bar, featured current step, upcoming list.
 */
export function ProgressSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <Skeleton className="h-px w-full" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Roadmap skeleton — a vertical editorial journey: goal node, milestone
 * headers, and step rows stacked along a spine.
 */
export function RoadmapSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl" aria-hidden="true">
      <Skeleton className="mx-auto h-20 w-full" />
      <div className="ml-4 mt-1 space-y-4 border-l border-surface-800/60 pl-6 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-9 w-[88%]" />
            <Skeleton className="h-9 w-[70%]" />
          </div>
        ))}
      </div>
    </div>
  )
}