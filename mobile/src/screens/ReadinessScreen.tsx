/**
 * ReadinessScreen — large ring, HRV / temp / recovery stat cards, trend chart.
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
import { ScoreRing } from '../components/ScoreRing'
import { StatCard } from '../components/StatCard'
import { TrendChart } from '../components/TrendChart'
import { useQuery, invalidateCache } from '../hooks/useOuraData'
import { api } from '../api/client'
import { THEME } from '../theme'
import { scoreLabel } from '../types/oura'
import type { ReadinessDay } from '../types/oura'

const W = Dimensions.get('window').width
const CHART_W = W - 48

export default function ReadinessScreen() {
  const readinessQ = useQuery<ReadinessDay[]>('readiness14', () => api.readiness(14))

  const loading = readinessQ.loading && !readinessQ.data

  const onRefresh = useCallback(() => {
    invalidateCache('readiness')
    readinessQ.refetch()
  }, [readinessQ])

  const latest = readinessQ.data?.[readinessQ.data.length - 1] ?? null
  const score  = latest?.score ?? null

  // Contributor scores (0-100)
  const hrvBalance     = latest?.contributors?.hrv_balance       ?? null
  const tempDev        = latest?.temperature_deviation           ?? null
  const recoveryIndex  = latest?.contributors?.recovery_index    ?? null
  const restingHR      = latest?.contributors?.resting_heart_rate ?? null

  // Trend data
  const trendData = (readinessQ.data ?? []).map(d => ({ date: d.date, value: d.score }))

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={THEME.readiness} />
          <Text style={styles.loadingText}>Loading readiness data…</Text>
        </View>
      </SafeAreaView>
    )
  }

  const hasData = latest != null

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={readinessQ.loading}
            onRefresh={onRefresh}
            tintColor={THEME.readiness}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.screenTitle}>Readiness</Text>

        {/* Error */}
        {readinessQ.error ? (
          <ErrorBanner message={readinessQ.error} onRetry={onRefresh} />
        ) : null}

        {/* Empty */}
        {!hasData && !readinessQ.error ? (
          <EmptyState />
        ) : null}

        {/* Large ring */}
        {hasData ? (
          <View style={styles.ringArea}>
            <ScoreRing
              score={score}
              color={THEME.readiness}
              size={180}
              label={scoreLabel(score)}
            />
            {latest.date ? (
              <Text style={styles.ringDate}>{latest.date}</Text>
            ) : null}
            {latest.day_summary ? (
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryText}>{latest.day_summary}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Stat grid */}
        {hasData ? (
          <>
            <SectionTitle label="Recovery Factors" />
            <View style={styles.grid}>
              <StatCard
                title="HRV Balance"
                value={hrvBalance}
                unit="/ 100"
                iconName="pulse-outline"
                accentColor={THEME.hrv}
                loading={readinessQ.loading}
              />
              <StatCard
                title="Body Temp"
                value={tempDev != null ? (tempDev >= 0 ? `+${tempDev.toFixed(1)}` : tempDev.toFixed(1)) : null}
                unit="°C"
                iconName="thermometer-outline"
                accentColor={tempDev != null && Math.abs(tempDev) > 0.5 ? THEME.fair : THEME.readiness}
                loading={readinessQ.loading}
              />
            </View>
            <View style={styles.grid}>
              <StatCard
                title="Recovery Index"
                value={recoveryIndex}
                unit="/ 100"
                iconName="refresh-outline"
                accentColor={THEME.readiness}
                loading={readinessQ.loading}
              />
              <StatCard
                title="Resting HR"
                value={restingHR}
                unit="/ 100"
                iconName="heart-outline"
                accentColor={THEME.sleep}
                loading={readinessQ.loading}
              />
            </View>

            {/* Stress / recovery */}
            {(latest.stress_high != null || latest.recovery_high != null) ? (
              <View style={styles.grid}>
                <StatCard
                  title="Stress High"
                  value={latest.stress_high != null ? `${latest.stress_high}%` : null}
                  iconName="flash-outline"
                  accentColor={THEME.error}
                />
                <StatCard
                  title="Recovery High"
                  value={latest.recovery_high != null ? `${latest.recovery_high}%` : null}
                  iconName="leaf-outline"
                  accentColor={THEME.readiness}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {/* 14-day trend */}
        {trendData.length > 1 ? (
          <>
            <SectionTitle label="14-Day Readiness Trend" />
            <View style={styles.chartCard}>
              <TrendChart
                data={trendData}
                dataKey="value"
                color={THEME.readiness}
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

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💚</Text>
      <Text style={styles.emptyTitle}>No readiness data yet</Text>
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
  summaryBadge: {
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
  },
  summaryText: {
    color: THEME.readiness,
    fontSize: 13,
    fontWeight: '600',
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
    color: THEME.readiness,
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
