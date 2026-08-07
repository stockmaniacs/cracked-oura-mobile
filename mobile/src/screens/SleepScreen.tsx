/**
 * SleepScreen — large score ring, stat grid, trend chart, stage bars.
 */
import React, { useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BarChart } from 'react-native-gifted-charts'
import { ScoreRing } from '../components/ScoreRing'
import { StatCard } from '../components/StatCard'
import { TrendChart } from '../components/TrendChart'
import { useQuery, invalidateCache } from '../hooks/useOuraData'
import { api } from '../api/client'
import { THEME } from '../theme'
import { fmtMinutes, scoreLabel } from '../types/oura'
import type { SleepDay, TodaySummary } from '../types/oura'

const W = Dimensions.get('window').width
const CHART_W = W - 48

export default function SleepScreen() {
  const sleepQ = useQuery<SleepDay[]>('sleep14', () => api.sleep(14))
  const todayQ = useQuery<TodaySummary>('today',  () => api.todaySummary())

  const loading = (sleepQ.loading && !sleepQ.data) || (todayQ.loading && !todayQ.data)

  const onRefresh = useCallback(() => {
    invalidateCache('sleep')
    invalidateCache('today')
    sleepQ.refetch()
    todayQ.refetch()
  }, [sleepQ, todayQ])

  const latestSleep = sleepQ.data?.[sleepQ.data.length - 1] ?? null
  const todaySleep  = todayQ.data?.sleep ?? null
  const score = latestSleep?.score ?? null

  // Stage durations from today summary (minutes)
  const deep  = todaySleep?.deep_sleep_minutes  ?? null
  const rem   = todaySleep?.rem_sleep_minutes   ?? null
  const total = todaySleep?.total_sleep_minutes ?? null
  const light = (total != null && deep != null && rem != null)
    ? Math.max(0, total - deep - rem) : null

  // Efficiency & latency from contributors (scores 0-100)
  const effScore = latestSleep?.contributors?.efficiency ?? null
  const latScore = latestSleep?.contributors?.latency    ?? null

  // Sleep stages bar data
  const stageData = [
    { value: deep  ?? 0, label: 'Deep',  frontColor: THEME.sleep },
    { value: rem   ?? 0, label: 'REM',   frontColor: THEME.hrv },
    { value: light ?? 0, label: 'Light', frontColor: THEME.readiness },
  ]
  const maxStage = Math.max(...stageData.map(d => d.value), 60)

  // Trend data (score over 14 days)
  const trendData = (sleepQ.data ?? []).map(d => ({ date: d.date, value: d.score }))

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={THEME.sleep} />
          <Text style={styles.loadingText}>Loading sleep data…</Text>
        </View>
      </SafeAreaView>
    )
  }

  const hasData = latestSleep != null

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={sleepQ.loading || todayQ.loading}
            onRefresh={onRefresh}
            tintColor={THEME.sleep}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.screenTitle}>Sleep</Text>

        {/* Error */}
        {sleepQ.error ? (
          <ErrorBanner message={sleepQ.error} onRetry={onRefresh} />
        ) : null}

        {/* Empty state */}
        {!hasData && !sleepQ.error ? (
          <EmptyState label="No sleep data yet" />
        ) : null}

        {/* Large ring */}
        {hasData ? (
          <View style={styles.ringArea}>
            <ScoreRing score={score} color={THEME.sleep} size={180} label={scoreLabel(score)} />
            {latestSleep?.date ? (
              <Text style={styles.ringDate}>{latestSleep.date}</Text>
            ) : null}
            {latestSleep?.recommendation ? (
              <Text style={styles.recommendation} numberOfLines={3}>
                {latestSleep.recommendation}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Stat grid */}
        {hasData ? (
          <>
            <SectionTitle label="Last Night" />
            <View style={styles.grid}>
              <StatCard
                title="Total Sleep"
                value={fmtMinutes(total)}
                iconName="moon-outline"
                accentColor={THEME.sleep}
                loading={todayQ.loading}
              />
              <StatCard
                title="Deep Sleep"
                value={fmtMinutes(deep)}
                iconName="water-outline"
                accentColor="#7B61FF"
                loading={todayQ.loading}
              />
            </View>
            <View style={styles.grid}>
              <StatCard
                title="REM Sleep"
                value={fmtMinutes(rem)}
                iconName="eye-outline"
                accentColor={THEME.hrv}
                loading={todayQ.loading}
              />
              <StatCard
                title="Light Sleep"
                value={fmtMinutes(light)}
                iconName="partly-sunny-outline"
                accentColor={THEME.readiness}
                loading={todayQ.loading}
              />
            </View>
            <View style={styles.grid}>
              <StatCard
                title="Efficiency"
                value={effScore != null ? effScore : null}
                unit="/ 100"
                iconName="trending-up-outline"
                accentColor={THEME.fair}
                loading={sleepQ.loading}
              />
              <StatCard
                title="Latency"
                value={latScore != null ? latScore : null}
                unit="/ 100"
                iconName="alarm-outline"
                accentColor={THEME.muted}
                loading={sleepQ.loading}
              />
            </View>
          </>
        ) : null}

        {/* Sleep stages bar chart */}
        {hasData && total != null ? (
          <>
            <SectionTitle label="Stage Breakdown" />
            <View style={styles.chartCard}>
              <BarChart
                data={stageData}
                barWidth={44}
                spacing={28}
                barBorderRadius={6}
                backgroundColor="transparent"
                yAxisColor="transparent"
                xAxisColor="rgba(255,255,255,0.07)"
                yAxisTextStyle={{ color: THEME.muted, fontSize: 9 }}
                xAxisLabelTextStyle={{ color: THEME.muted, fontSize: 11 }}
                noOfSections={4}
                maxValue={maxStage}
                width={CHART_W - 32}
                height={140}
                isAnimated
              />
              <Text style={styles.chartNote}>Minutes per stage (last night)</Text>
            </View>
          </>
        ) : null}

        {/* 14-day trend */}
        {trendData.length > 1 ? (
          <>
            <SectionTitle label="14-Day Sleep Score Trend" />
            <View style={styles.chartCard}>
              <TrendChart
                data={trendData}
                dataKey="value"
                color={THEME.sleep}
                height={160}
                width={CHART_W - 32}
                yDomain={[0, 100]}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
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

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>😴</Text>
      <Text style={styles.emptyTitle}>{label}</Text>
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
  ringArea: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 10,
  },
  ringDate: {
    fontSize: 13,
    color: THEME.muted,
  },
  recommendation: {
    fontSize: 13,
    color: THEME.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
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
    textAlign: 'center',
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
    color: THEME.sleep,
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
