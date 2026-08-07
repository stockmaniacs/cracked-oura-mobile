import { useQuery } from '@/hooks/useOuraData'
import { api } from '@/api/client'
import { ScoreRing } from '@/components/ScoreRing'
import { Sparkline } from '@/components/Sparkline'
import { ErrorBanner } from '@/components/ErrorBanner'
import { EmptyState } from '@/components/EmptyState'
import { RingSkeleton } from '@/components/Skeleton'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { scoreColor, fmtMinutes, COLORS } from '@/types/oura'
import type { TodaySummary, SleepDay } from '@/types/oura'
import { RefreshCw } from 'lucide-react'
import { hasApiKey } from '@/store/apiKey'

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })
}

export default function Today() {
  const { data, loading, error, refetch } = useQuery<TodaySummary>('summary/today', () => api.todaySummary())
  const { data: sleepHistory }            = useQuery<SleepDay[]>('sleep/3', () => api.sleep(3))
  const { syncing, triggerSync }          = useSyncStatus()

  if (!hasApiKey()) {
    return (
      <EmptyState
        icon="🔑"
        title="API key required"
        message="Go to Settings and paste your SECRET_KEY to connect to the backend."
      />
    )
  }

  if (error) return <ErrorBanner message={error} onRetry={refetch} />

  const hasData = data && (data.scores.sleep != null || data.scores.readiness != null || data.scores.activity != null)

  // Sparkline: last 3 sleep scores
  const sparkData = (sleepHistory ?? []).map(d => ({ date: d.date, value: d.score }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          {data && <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(data.date)}</p>}
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium
            bg-sleep/10 hover:bg-sleep/20 text-sleep disabled:opacity-50 transition-all"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync'}
        </button>
      </div>

      {/* Score rings */}
      {loading ? (
        <div className="flex justify-around py-2">
          <RingSkeleton size={120} />
          <RingSkeleton size={120} />
          <RingSkeleton size={120} />
        </div>
      ) : !hasData ? (
        <EmptyState message="Sync your Oura ring to see today's scores." />
      ) : (
        <div className="flex justify-around py-2">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={data!.scores.sleep} category="sleep" size={120} showLabel />
            <span className="text-xs font-medium text-muted-foreground">Sleep</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={data!.scores.readiness} category="readiness" size={120} showLabel />
            <span className="text-xs font-medium text-muted-foreground">Readiness</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={data!.scores.activity} category="activity" size={120} showLabel />
            <span className="text-xs font-medium text-muted-foreground">Activity</span>
          </div>
        </div>
      )}

      {/* Last night summary */}
      {data?.sleep && (
        <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Last Night</p>
            {data.sleep.recommendation && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sleep/10 text-sleep font-medium">
                {data.scores.sleep != null && data.scores.sleep >= 80 ? '✦ Great' : 'Fair'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              { label: 'Total Sleep', value: fmtMinutes(data.sleep.total_sleep_minutes), color: COLORS.sleep },
              { label: 'Deep Sleep',  value: fmtMinutes(data.sleep.deep_sleep_minutes),  color: '#818CF8' },
              { label: 'REM Sleep',   value: fmtMinutes(data.sleep.rem_sleep_minutes),   color: '#34D399' },
              { label: 'Avg HRV',     value: data.sleep.average_hrv != null ? `${data.sleep.average_hrv} ms` : '–', color: COLORS.hrv },
              { label: 'Resting HR',  value: data.sleep.average_heart_rate != null ? `${Math.round(data.sleep.average_heart_rate)} bpm` : '–', color: COLORS.readiness },
              { label: 'SpO₂',        value: data.sleep.average_spo2 != null ? `${data.sleep.average_spo2.toFixed(1)}%` : '–', color: COLORS.activity },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className="font-semibold text-xs" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>

          {data.sleep.recommendation && (
            <p className="text-xs text-muted-foreground border-t border-white/5 pt-2 leading-relaxed">
              {data.sleep.recommendation}
            </p>
          )}
        </div>
      )}

      {/* 3-night sleep sparkline */}
      {sparkData.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-card p-4 animate-fade-in">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Last 3 Nights — Sleep Score
          </p>
          <div className="flex items-end gap-3">
            {sparkData.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor(d.value, 'sleep') }}>
                  {d.value ?? '–'}
                </span>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${d.value ?? 0}%`, background: scoreColor(d.value, 'sleep') }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {new Date(d.date + 'T00:00').toLocaleDateString('en-US', { weekday:'short' })}
                </span>
              </div>
            ))}
          </div>
          {sparkData.length >= 3 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <Sparkline data={sparkData} color={COLORS.sleep} height={36} />
            </div>
          )}
        </div>
      )}

      {/* Readiness + Activity quick stats */}
      {(data?.readiness || data?.activity) && (
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          {data?.readiness && (
            <div className="rounded-2xl border border-white/5 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Readiness</p>
              <p className="text-xs text-muted-foreground capitalize">{data.readiness.day_summary ?? '–'}</p>
              {data.readiness.temperature_deviation != null && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Temp {data.readiness.temperature_deviation > 0 ? '+' : ''}{data.readiness.temperature_deviation.toFixed(2)}°C
                </p>
              )}
            </div>
          )}
          {data?.activity && (
            <div className="rounded-2xl border border-white/5 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Activity</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: COLORS.activity }}>
                {data.activity.steps?.toLocaleString() ?? '–'}
              </p>
              <p className="text-[11px] text-muted-foreground">steps</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
