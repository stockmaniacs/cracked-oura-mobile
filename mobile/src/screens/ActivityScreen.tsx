/**
 * ActivityScreen — steps progress ring, stat cards, 7-day steps bar chart.
 */
import React, { useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BarChart } from 'react-native-gifted-charts'
import { ScoreRing } from '../components/ScoreRing'
import { StatCard } from '../components/StatCard'
import { useQuery, invalidateCache } from '../hooks/useOuraData'
import { api } from '../api/client'
import { THEME } from '../theme'
import type { ActivityDay, TodaySummary } from '../types/oura'

const W = Dimensions.get('window').width
const CHART_W = W - 48
const STEP_GOAL = 10_000

export default function ActivityScreen() {
  const activityQ = useQuery<ActivityDay[]>('activity7', () => api.activity(7))
  const todayQ    = useQuery<TodaySummary>('today',     () => api.todaySummary())

  const loading = (activityQ.loading && !activityQ.data) || (todayQ.loading && !todayQ.data)

  const onRefresh = useCallback(() => {
    invalidateCache('activity')
    invalidateCache('today')
    activityQ.refetch()
    todayQ.refetch()
  }, [activityQ, todayQ])

  const todayActivity = todayQ.data?.activity ?? null
  const steps         = todayActivity?.steps          ?? null
  const activeCal     = todayActivity?.active_calories ?? null
  const totalCal      = todayActivity?.total_calories  ?? null

  // Steps ring: use score from todaySummary, or derive from step goal
  const activityScore = todayQ.data?.scores?.activity ?? null
  // Steps progress (for display in the ring)
  const stepsProgress = steps != null
    ? Math.min(100, Math.round((steps / STEP_GOAL) * 100))
    : null

  // 7-day bar data
  const barData = (activityQ.data ?? []).map(d => ({
    value: d.steps ?? 0,
    label: shortDay(d.date),
    frontColor: d.steps != null && d.steps >= STEP_GOAL ? THEME.readiness : THEME.activity,
  }))
  const maxSteps = Math.max(...barData.map(d => d.value), STEP_GOAL)

  // Average MET from most recent day
  const latestDay = activityQ.data?.[activityQ.data.length - 1] ?? null
  const avgMet    = latestDay?.average_met ?? null

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={THEME.activity} />
          <Text style={styles.loadingText}>Loading activity data…</Text>
        </View>
      </SafeAreaView>
    )
  }

  const hasData = todayActivity != null || activityQ.data != null

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={activityQ.loading || todayQ.loading}
            onRefresh={onRefresh}
            tintColor={THEME.activity}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.screenTitle}>Activity</Text>

        {/* Error */}
        {activityQ.error ? (
          <ErrorBanner message={activityQ.error} onRetry={onRefresh} />
        ) : null}

        {/* Empty */}
        {!hasData && !activityQ.error ? (
          <EmptyState />
        ) : null}

        {/* Steps progress ring + score ring */}
        {hasData ? (
          <View style={styles.ringsRow}>
            {/* Steps ring */}
            <View style={styles.ringCol}>
              <ScoreRing
                score={stepsProgress}
                color={THEME.activity}
                size={160}
                label={`${fmtNum(steps)} steps`}
              />
              <Text style={styles.ringSubLabel}>Goal: {fmtNum(STEP_GOAL)}</Text>
            </View>
            {/* Activity score ring */}
            <View style={styles.ringCol}>
              <ScoreRing
                score={activityScore}
                color={THEME.readiness}
                size={100}
                label="Score"
              />
            </View>
          </View>
        ) : null}

        {/* Stat cards */}
        {hasData ? (
          <>
            <SectionTitle label="Today's Stats" />
            <View style={styles.grid}>
              <StatCard
                title="Steps"
                value={fmtNum(steps)}
                iconName="footsteps-outline"
                accentColor={THEME.activity}
                loading={todayQ.loading}
              />
              <StatCard
                title="Active Cal"
                value={activeCal != null ? Math.round(activeCal) : null}
                unit="kcal"
                iconName="flash-outline"
                accentColor={THEME.fair}
                loading={todayQ.loading}
              />
            </View>
            <View style={styles.grid}>
              <StatCard
                title="Total Cal"
                value={totalCal != null ? Math.round(totalCal) : null}
                unit="kcal"
                iconName="flame-outline"
                accentColor="#FF6B35"
                loading={todayQ.loading}
              />
              <StatCard
                title="Avg MET"
                value={avgMet != null ? avgMet.toFixed(1) : null}
                iconName="fitness-outline"
                accentColor={THEME.hrv}
                loading={activityQ.loading}
              />
            </View>
          </>
        ) : null}

        {/* 7-day steps bar chart */}
        {barData.length > 0 ? (
          <>
            <SectionTitle label="7-Day Steps" />
            <View style={styles.chartCard}>
              <BarChart
                data={barData}
                barWidth={28}
                spacing={12}
                barBorderRadius={6}
                backgroundColor="transparent"
                yAxisColor="transparent"
                xAxisColor="rgba(255,255,255,0.07)"
                yAxisTextStyle={{ color: THEME.muted, fontSize: 9 }}
                xAxisLabelTextStyle={{ color: THEME.muted, fontSize: 10 }}
                noOfSections={4}
                maxValue={maxSteps}
                width={CHART_W - 32}
                height={160}
                isAnimated
              />
              {/* Goal line annotation */}
              <Text style={styles.chartNote}>
                🟢 Green bar = goal reached ({fmtNum(STEP_GOAL)} steps)
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '–'
  return n.toLocaleString('en-IN')
}

function shortDay(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)
  } catch {
    return dateStr.slice(-2)
  }
}

// ── Shared mini components ────────────────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
      <Text style={styles.retryText} onPress={onRetry}>Retry</Text>
    </View>
  )
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🏃</Text>
      <Text style={styles.emptyTitle}>No activity data yet</Text>
      <Text style={styles.emptyText}>Pull down to refresh after syncing.</Text>
    </View>
  )
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: THEME.muted,
    fontSize: 14,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: -0.5,
    marginBottom: 20,
    marginTop: 4,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 28,
  },
  ringCol: {
    alignItems: 'center',
    gap: 8,
  },
  ringSubLabel: {
    fontSize: 11,
    color: THEME.muted,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: THEME.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chartNote: {
    fontSize: 10,
    color: THEME.muted,
    marginTop: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(239,83,80,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.25)',
  },
  errorText: {
    color: THEME.error,
    fontSize: 13,
    flex: 1,
  },
  retryText: {
    color: THEME.activity,
    fontSize: 13,
    fontWeight: '700',
    paddingLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.muted,
    textAlign: 'center',
  },
})
