import { useState } from 'react'
import { useQuery } from '@/hooks/useOuraData'
import { api } from '@/api/client'
import { ScoreRing } from '@/components/ScoreRing'
import { StatCard } from '@/components/StatCard'
import { TrendChart } from '@/components/TrendChart'
import { ErrorBanner } from '@/components/ErrorBanner'
import { EmptyState } from '@/components/EmptyState'
import { StatCardSkeleton, RingSkeleton, ChartSkeleton } from '@/components/Skeleton'
import { COLORS } from '@/types/oura'
import type { TodaySummary, ReadinessDay } from '@/types/oura'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const DAYS_OPTIONS = [7, 14, 30] as const
type Days = (typeof DAYS_OPTIONS)[number]

// ── Contributor row ────────────────────────────────────────────────────────────
function ContributorRow({ label, value, impact }: {
  label: string; value: number | null | undefined; impact?: 'up' | 'down' | 'neutral'
}) {
  const v = value ?? 0
  const Icon = impact === 'up' ? TrendingUp : impact === 'down' ? TrendingDown : Minus
  const iconColor = impact === 'up' ? COLORS.readiness : impact === 'down' ? COLORS.poor : 'hsl(215 20% 55%)'

  return (
    <div className="flex items-center gap-3">
      <Icon size={13} style={{ color: iconColor, flexShrink: 0 }} className="shrink-0" />
      <span className="text-xs text-muted-foreground flex-1 capitalize">{label.replace(/_/g, ' ')}</span>
      <div className="w-28 rounded-full overflow-hidden h-1.5 bg-white/8">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${v}%`, background: v >= 80 ? COLORS.readiness : v >= 60 ? COLORS.fair : COLORS.poor }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-6 text-right" style={{
        color: v >= 80 ? COLORS.readiness : v >= 60 ? COLORS.fair : COLORS.poor
      }}>{value ?? '–'}</span>
    </div>
  )
}

function impactOf(v: number | null | undefined): 'up' | 'down' | 'neutral' {
  if (v == null) return 'neutral'
  if (v >= 80)  return 'up'
  if (v >= 60)  return 'neutral'
  return 'down'
}

export default function Readiness() {
  const [days, setDays] = useState<Days>(14)

  const { data: today, loading: loadingToday, error: errToday, refetch: refetchToday } =
    useQuery<TodaySummary>('summary/today', () => api.todaySummary())

  const { data: history, loading: loadingHistory, error: errHistory, refetch: refetchHistory } =
    useQuery<ReadinessDay[]>(`readiness/${days}`, () => api.readiness(days))

  const readiness = today?.readiness
  const score     = today?.scores.readiness ?? null
  const loading   = loadingToday || loadingHistory
  const error     = errToday || errHistory

  const trendData = (history ?? []).map(d => ({ date: d.date, score: d.score }))

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold">Readiness</h1>
      {error && <ErrorBanner message={error} onRetry={() => { refetchToday(); refetchHistory() }} />}

      {/* Score ring */}
      <div className="flex flex-col items-center py-4">
        {loading ? <RingSkeleton size={160} /> : (
          <>
            <ScoreRing score={score} category="readiness" size={160} showLabel />
            {readiness?.day_summary && (
              <p className="text-xs text-muted-foreground mt-2 capitalize">{readiness.day_summary}</p>
            )}
          </>
        )}
      </div>

      {/* Stat cards */}
      {!readiness && !loading ? (
        <EmptyState icon="💚" message="Sync your ring to see readiness data." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {loading ? Array.from({length:4}).map((_,i) => <StatCardSkeleton key={i} />) : <>
            <StatCard title="Readiness Score" value={score} unit="/ 100" color={COLORS.readiness} />
            <StatCard
              title="Body Temp"
              value={readiness?.temperature_deviation != null
                ? `${readiness.temperature_deviation > 0 ? '+' : ''}${readiness.temperature_deviation.toFixed(2)}`
                : null}
              unit="°C"
              color={Math.abs(readiness?.temperature_deviation ?? 0) > 0.3 ? COLORS.poor : COLORS.readiness}
              subtitle={Math.abs(readiness?.temperature_deviation ?? 0) > 0.3 ? 'Elevated' : 'Normal range'}
            />
            <StatCard
              title="HRV Balance"
              value={readiness?.contributors?.hrv_balance ?? null}
              unit="/ 100"
              color={COLORS.hrv}
            />
            <StatCard
              title="Recovery Index"
              value={readiness?.contributors?.recovery_index ?? null}
              unit="/ 100"
              color={COLORS.readiness}
            />
            <StatCard
              title="Activity Balance"
              value={readiness?.contributors?.activity_balance ?? null}
              unit="/ 100"
              color={COLORS.activity}
            />
            <StatCard
              title="Sleep Balance"
              value={readiness?.contributors?.sleep_balance ?? null}
              unit="/ 100"
              color={COLORS.sleep}
            />
          </>}
        </div>
      )}

      {/* Contributors breakdown */}
      {readiness?.contributors && (
        <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What drove today's score</p>
          {Object.entries(readiness.contributors)
            .filter(([, v]) => v != null)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([k, v]) => (
              <ContributorRow key={k} label={k} value={v as number} impact={impactOf(v as number)} />
            ))}
          {readiness.temperature_deviation != null && (
            <ContributorRow
              label="Temperature deviation"
              value={Math.round(Math.abs(readiness.temperature_deviation) * 10)}
              impact={Math.abs(readiness.temperature_deviation) > 0.3 ? 'down' : 'up'}
            />
          )}
        </div>
      )}

      {/* Resilience */}
      {today?.resilience?.level && (
        <div className="rounded-2xl border border-white/5 bg-card p-4 flex items-center justify-between animate-fade-in">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resilience</p>
            <p className="text-base font-bold mt-1 capitalize" style={{ color: COLORS.readiness }}>
              {today.resilience.level}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs text-muted-foreground">Sleep recovery <span className="font-semibold text-foreground">{today.resilience.sleep_recovery != null ? Math.round(today.resilience.sleep_recovery * 100) + '%' : '–'}</span></p>
            <p className="text-xs text-muted-foreground">Daytime recovery <span className="font-semibold text-foreground">{today.resilience.daytime_recovery != null ? Math.round(today.resilience.daytime_recovery * 100) + '%' : '–'}</span></p>
          </div>
        </div>
      )}

      {/* Trend chart */}
      <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Readiness Trend</p>
          <div className="flex gap-1">
            {DAYS_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                  days === d ? 'bg-readiness/20 text-readiness' : 'text-muted-foreground hover:text-foreground'
                }`}
              >{d}d</button>
            ))}
          </div>
        </div>
        {loadingHistory ? <ChartSkeleton height={180} /> : (
          <TrendChart data={trendData} dataKey="score" color={COLORS.readiness} height={180} yDomain={[0, 100]} />
        )}
      </div>
    </div>
  )
}
