import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number | null
  unit?: string
  subtitle?: string
  color?: string
  loading?: boolean
  className?: string
  onClick?: () => void
}

export function StatCard({ title, value, unit, subtitle, color, loading, className, onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/5 bg-card p-4 flex flex-col gap-1.5 animate-fade-in',
        onClick && 'cursor-pointer hover:border-white/10 transition-colors',
        className,
      )}
      onClick={onClick}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
        {title}
      </p>

      {loading ? (
        <div className="h-8 w-20 shimmer rounded-lg" />
      ) : (
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className="text-2xl font-bold leading-none tabular-nums truncate"
            style={color ? { color } : undefined}
          >
            {value ?? '–'}
          </span>
          {unit && <span className="text-xs text-muted-foreground shrink-0">{unit}</span>}
        </div>
      )}

      {subtitle && !loading && (
        <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
      )}
      {loading && <div className="h-3 w-14 shimmer rounded" />}
    </div>
  )
}
