import { useState } from 'react'
import { useQuery } from '@/hooks/useOuraData'
import { api } from '@/api/client'
import { StepsRing } from '@/components/StepsRing'
import { StatCard } from '@/components/StatCard'
import { TrendChart } from '@/components/TrendChart'
import { ErrorBanner } from '@/components/ErrorBanner'
import { EmptyState } from '@/components/EmptyState'
import { StatCardSkeleton, RingSkeleton, ChartSkeleton } from '@/components/Skeleton'
import { COLORS } from '@/types/oura'
import type { TodaySummary, ActivityDay } from '@/types/oura'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

const DAYS_OPTIONS = [7, 14, 30] as const
type Days = (typeof DAYS_OPTIONS)[number]

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday:'short' })
}

function fmtSeconds(s: number | null | undefined) {
  if (s == null) return '–'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function Activity() {
  const [days, setDays] = useState<Days>(7)

  const { data: today, loading: loadingToday, error: errToday, refetch: refetchToday } =
    useQuery<TodaySummary>('summary/today', () => api.todaySummary())

  const { data: history, loading: loadingHistory, error: errHistory, refetch: refetchHistory } =
    useQuery<ActivityDay[]>(`activity/${days}`, () => api.activity(days))

  const activity = today?.activity
  const loading  = loadingToday || loadingHistory
  const error    = errToday || errHistory

  // 7-day steps bar data
  const barsData = (history ?? []).slice(-7).map(d => ({
    date: d.date,
    steps: d.steps ?? 0,
    label: fmtDate(d.date),
  }))

  const avgSteps = barsData.length
    ? Math.round(barsData.reduce((s, d) => s + d.steps, 0) / barsData.length)
    : null

  const trendData = (history ?? []).map(d => ({ date: d.date, score: d.score, steps: d.steps }))

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold">Activity</h1>
      {error && <ErrorBanner message={error} onRetry={() => { refetchToday(); refetchHistory() }} />}

      {/* Steps arc ring */}
      <div className="flex justify-center py-2">
        {loading ? <RingSkeleton size={200} /> : (
          <StepsRing steps={activity?.steps ?? null} goal={10_000} size={200} />
        )}
      </div>

      {/* Stat cards */}
      {!activity && !loading ? (
        <EmptyState icon="🏃" message="Sync your ring to see activity data." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {loading ? Array.from({length:6}).map((_,i) => <StatCardSkeleton key={i} />) : <>
            <StatCard title="Activity Score"   value={today?.scores.activity ?? null} unit="/ 100" color={COLORS.activity} />
            <StatCard title="Steps"            value={activity?.steps?.toLocaleString() ?? null} color={COLORS.activity} />
            <StatCard title="Active Calories"  value={activity?.active_calories ?? null} unit="kcal" color={COLORS.readiness} />
            <StatCard title="Total Calories"   value={activity?.total_calories ?? null}  unit="kcal" color={COLORS.hrv} />
            <StatCard title="High Activity"    value={fmtSeconds(activity?.high_activity_time)}   color="#F97316" subtitle="vigorous" />
            <StatCard title="Low Activity"     value={fmtSeconds(activity?.low_activity_time)}    color={COLORS.sleep} subtitle="light" />
          </>}
        </div>
      )}

      {/* 7-day steps bar chart */}
      <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Daily Steps</p>
          {avgSteps != null && (
            <span className="text-xs text-muted-foreground">
              avg <span className="font-semibold text-foreground">{avgSteps.toLocaleString()}</span>
            </span>
          )}
        </div>
        {loadingHistory ? <ChartSkeleton height={180} /> : barsData.length === 0 ? (
          <EmptyState icon="📊" message="No step data yet." />
        ) : (
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barsData} margin={{ top:4, right:8, left:-24, bottom:0 }}>
                <XAxis dataKey="label" tick={{ fontSize:10, fill:'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(215 20% 55%)' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  contentStyle={{ backgroundColor:'#1A1A2E', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:12 }}
                  formatter={(v: unknown) => [(v as number ?? 0).toLocaleString(), 'Steps']}
                />
                {/* Goal reference line at 10k */}
                <Bar dataKey="steps" radius={[5,5,0,0]}>
                  {barsData.map(d => (
                    <Cell key={d.date} fill={d.steps >= 10_000 ? COLORS.activity : 'rgba(255,152,0,0.45)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">Bright bars = goal reached (10,000 steps)</p>
      </div>

      {/* Score trend */}
      <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Activity Score Trend</p>
          <div className="flex gap-1">
            {DAYS_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                  days === d ? 'bg-activity/20 text-activity' : 'text-muted-foreground hover:text-foreground'
                }`}
              >{d}d</button>
            ))}
          </div>
        </div>
        {loadingHistory ? <ChartSkeleton height={160} /> : (
          <TrendChart data={trendData} dataKey="score" color={COLORS.activity} height={160} yDomain={[0, 100]} />
        )}
      </div>
    </div>
  )
}
