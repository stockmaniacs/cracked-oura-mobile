import { cn } from '@/lib/utils'

interface SkeletonProps { className?: string }

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('shimmer rounded-xl', className)} />
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function RingSkeleton({ size = 140 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton className="rounded-full" style={{ width: size, height: size }} />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return <Skeleton className="w-full rounded-2xl" style={{ height }} />
}
