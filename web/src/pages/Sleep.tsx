import { useRef, useState } from 'react'
import { useQuery } from '@/hooks/useOuraData'
import { api } from '@/api/client'
import { ScoreRing } from '@/components/ScoreRing'
import { StatCard } from '@/components/StatCard'
import { TrendChart } from '@/components/TrendChart'
import { ErrorBanner } from '@/components/ErrorBanner'
import { EmptyState } from '@/components/EmptyState'
import { StatCardSkeleton, RingSkeleton, ChartSkeleton } from '@/components/Skeleton'
import { COLORS, fmtMinutes, scoreLabel } from '@/types/oura'
import type { TodaySummary, SleepDay } from '@/types/oura'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import { ChevronDown } from 'lucide-react'

const DAYS_OPTIONS = [7, 14, 30] as const
type Days = (typeof DAYS_OPTIONS)[number]

// ── Pull-to-refresh ────────────────────────────────────────────────────────────
function usePullToRefresh(onRefresh: () => void) {
  const startY   = useRef(0)
  const [pullY, setPullY] = useState(0)
  const THRESHOLD = 72

  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY }
  const onTouchMove  = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) setPullY(Math.min(delta * 0.45, THRESHOLD + 16))
  }
  const onTouchEnd   = () => {
    if (pullY >= THRESHOLD) onRefresh()
    setPullY(0)
  }
  return { pullY, onTouchStart, onTouchMove, onTouchEnd }
}

// ── Contributor bar ────────────────────────────────────────────────────────────
function ContributorBar({ label, value }: { label: string; value: number | null | undefined }) {
  const v = value ?? 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 capitalize">{label.replace(/_/g, ' ')}</span>
      <div className="flex-1 rounded-full overflow-hidden h-1.5 bg-white/8">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${v}%`, background: v >= 80 ? COLORS.sleep : v >= 60 ? COLORS.fair : COLORS.poor }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{
        color: v >= 80 ? COLORS.sleep : v >= 60 ? COLORS.fair : COLORS.poor,
      }}>{value ?? '–'}</span>
    </div>
  )
}

export default function Sleep() {
  const [days, setDays] = useState<Days>(14)

  const { data: today, loading: loadingToday, error: errToday, refetch: refetchToday } =
    useQuery<TodaySummary>('summary/today', () => api.todaySummary())

  const { data: history, loading: loadingHistory, error: errHistory, refetch: refetchHistory } =
    useQuery<SleepDay[]>(`sleep/${days}`, () => api.sleep(days))

  const { pullY, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(() => {
    refetchToday(); refetchHistory()
  })

  const sleep    = today?.sleep
  const score    = today?.scores.sleep ?? null
  const loading  = loadingToday || loadingHistory
  const error    = errToday || errHistory

  // Stage breakdown data for bar chart (from today summary minutes)
  const totalMins = sleep?.total_sleep_minutes ?? 0
  const deepMins  = sleep?.deep_sleep_minutes  ?? 0
  const remMins   = sleep?.rem_sleep_minutes   ?? 0
  const lightMins = Math.max(0, totalMins - deepMins - remMins)

  const stageData = (deepMins || remMins || lightMins) ? [
    { stage: 'Deep',  mins: deepMins,  color: '#818CF8' },
    { stage: 'REM',   mins: remMins,   color: '#34D399' },
    { stage: 'Light', mins: lightMins, color: COLORS.sleep },
  ] : []

  const trendData = (history ?? []).map(d => ({ date: d.date, score: d.score }))

  return (
    <div
      className="space-y-5 animate-fade-in"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      {pullY > 0 && (
        <div className="flex justify-center" style={{ height: pullY, overflow: 'hidden', transition: 'height 0.1s' }}>
          <ChevronDown size={18} className="text-muted-foreground animate-bounce mt-2" />
        </div>
      )}

      <h1 className="text-2xl font-bold">Sleep</h1>
      {error && <ErrorBanner message={error} onRetry={() => { refetchToday(); refetchHistory() }} />}

      {/* Score ring */}
      <div className="flex flex-col items-center py-4">
        {loading ? <RingSkeleton size={160} /> : (
          <>
            <ScoreRing score={score} category="sleep" size={160} showLabel />
            {score != null && (
              <p className="text-xs text-muted-foreground mt-2">{scoreLabel(score)}</p>
            )}
          </>
        )}
      </div>

      {/* Stat cards */}
      {!sleep && !loading ? (
        <EmptyState icon="🌙" message="Sync your ring to see sleep data." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {loading ? Array.from({length:6}).map((_,i) => <StatCardSkeleton key={i} />) : <>
            <StatCard title="Total Sleep"  value={fmtMinutes(sleep?.total_sleep_minutes)}  color={COLORS.sleep}     className="col-span-2" />
            <StatCard title="Deep Sleep"   value={fmtMinutes(sleep?.deep_sleep_minutes)}   color="#818CF8" />
            <StatCard title="REM Sleep"    value={fmtMinutes(sleep?.rem_sleep_minutes)}    color="#34D399" />
            <StatCard title="Avg HRV"      value={sleep?.average_hrv != null ? `${sleep.average_hrv}` : null} unit="ms" color={COLORS.hrv} />
            <StatCard title="Resting HR"   value={sleep?.average_heart_rate != null ? `${Math.round(sleep.average_heart_rate)}` : null} unit="bpm" color={COLORS.readiness} />
            <StatCard title="SpO₂"         value={sleep?.average_spo2 != null ? sleep.average_spo2.toFixed(1) : null} unit="%" color={COLORS.activity} />
            <StatCard title="Sleep Score"  value={score}  unit="/ 100"  color={COLORS.sleep} />
          </>}
        </div>
      )}

      {/* Stage breakdown */}
      {stageData.length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sleep Stages — Last Night</p>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top:4, right:8, left:-24, bottom:0 }}>
                <XAxis dataKey="stage" tick={{ fontSize:10, fill:'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:10, fill:'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} tickFormatter={v => fmtMinutes(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor:'#1A1A2E', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:12 }}
                  formatter={(v: number) => [fmtMinutes(v), 'Duration']}
                />
                <Bar dataKey="mins" radius={[6,6,0,0]}>
                  {stageData.map(d => <Cell key={d.stage} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Contributors */}
      {sleep?.contributors && Object.keys(sleep.contributors).length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Score Contributors</p>
          {Object.entries(sleep.contributors).map(([k, v]) => (
            <ContributorBar key={k} label={k} value={v} />
          ))}
        </div>
      )}

      {/* Trend chart */}
      <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sleep Score Trend</p>
          <div className="flex gap-1">
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                  days === d ? 'bg-sleep/20 text-sleep' : 'text-muted-foreground hover:text-foreground'
                }`}
              >{d}d</button>
            ))}
          </div>
        </div>
        {loadingHistory ? <ChartSkeleton height={180} /> : (
          <TrendChart data={trendData} dataKey="score" color={COLORS.sleep} height={180} yDomain={[0, 100]} />
        )}
      </div>
    </div>
  )
}
