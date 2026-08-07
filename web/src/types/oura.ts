// ── Design tokens ─────────────────────────────────────────────────────────────
export const COLORS = {
  sleep:     '#4CC9F0',
  readiness: '#4CAF50',
  activity:  '#FF9800',
  hrv:       '#AB47BC',
  good:      '#4CC9F0',
  fair:      '#F59E0B',
  poor:      '#EF4444',
  empty:     '#374151',
} as const

export type Category = 'sleep' | 'readiness' | 'activity' | 'hrv'

export function scoreColor(score: number | null, category?: Category): string {
  if (score == null) return COLORS.empty
  if (score < 60)   return COLORS.poor
  if (score < 80)   return COLORS.fair
  return category ? COLORS[category] : COLORS.good
}

export function scoreLabel(score: number | null): string {
  if (score == null) return '–'
  if (score >= 85)   return 'Optimal'
  if (score >= 70)   return 'Good'
  if (score >= 60)   return 'Fair'
  return 'Needs attention'
}

export function fmtMinutes(mins: number | null | undefined): string {
  if (mins == null) return '–'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Domain types (match /api/v1/* responses) ──────────────────────────────────
export interface TimeSeriesPoint {
  date: string
  value: number | null
  [key: string]: unknown
}

export interface SleepContributors {
  deep_sleep?: number | null; efficiency?: number | null; latency?: number | null
  rem_sleep?: number | null;  restfulness?: number | null; timing?: number | null
  total_sleep?: number | null
}

export interface SleepDay {
  date: string; score: number | null; contributors: SleepContributors
  average_spo2: number | null; breathing_disturbance_index: number | null
  optimal_bedtime: { start: string; end: string } | null
  recommendation: string | null; status: string | null
}

export interface ReadinessContributors {
  activity_balance?: number | null; body_temperature?: number | null
  hrv_balance?: number | null; previous_day_activity?: number | null
  recovery_index?: number | null; resting_heart_rate?: number | null
  sleep_balance?: number | null
}

export interface ReadinessDay {
  date: string; score: number | null; contributors: ReadinessContributors
  temperature_deviation: number | null; temperature_trend_deviation: number | null
  stress_high: number | null; recovery_high: number | null; day_summary: string | null
}

export interface ActivityContributors {
  meet_daily_targets?: number | null; move_every_hour?: number | null
  recovery_time?: number | null; stay_active?: number | null
  training_frequency?: number | null; training_volume?: number | null
}

export interface ActivityDay {
  date: string; score: number | null; steps: number | null
  total_calories: number | null; active_calories: number | null
  average_met: number | null; equivalent_walking_distance: number | null
  high_activity_time: number | null; medium_activity_time: number | null
  low_activity_time: number | null; sedentary_time: number | null
  non_wear_time: number | null; contributors: ActivityContributors
}

export interface HRVDay {
  date: string; average_hrv: number | null; average_heart_rate: number | null
  total_sleep_minutes: number | null; session_type: string | null
}

export interface ResilienceData {
  level: string | null; sleep_recovery: number | null; daytime_recovery: number | null
}

export interface TodaySummary {
  date: string
  scores: { sleep: number | null; activity: number | null; readiness: number | null }
  sleep: {
    score: number | null; contributors: SleepContributors; average_spo2: number | null
    recommendation: string | null; total_sleep_minutes: number | null
    deep_sleep_minutes: number | null; rem_sleep_minutes: number | null
    average_hrv: number | null; average_heart_rate: number | null
  } | null
  activity: {
    score: number | null; steps: number | null; active_calories: number | null
    total_calories: number | null; contributors: ActivityContributors
    high_activity_time?: number | null; low_activity_time?: number | null
  } | null
  readiness: {
    score: number | null; temperature_deviation: number | null
    contributors: ReadinessContributors; day_summary: string | null
  } | null
  resilience: ResilienceData | null
}

export interface WeekSummary {
  period: { start: string; end: string }
  sleep: Array<{ date: string; score: number | null; average_hrv: number | null; total_sleep_minutes: number | null }>
  activity: Array<{ date: string; score: number | null; steps: number | null; active_calories: number | null }>
  readiness: Array<{ date: string; score: number | null; temperature_deviation: number | null }>
  averages: {
    sleep_score: number | null; activity_score: number | null; readiness_score: number | null
    avg_steps: number | null; avg_active_calories: number | null
  }
}

export interface SyncStatus {
  status: 'Idle' | 'Running' | 'Error'
  last_sync: string | null; next_sync: string | null; schedule_time: string | null
  record_counts: Record<string, number>
}
