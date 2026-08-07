/**
 * TodayScreen — 3 score rings + sparklines + sync controls.
 */
import React, { useState, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { ScoreRing } from '../components/ScoreRing'
import { TrendChart } from '../components/TrendChart'
import { useQuery, invalidateCache } from '../hooks/useOuraData'
import { api } from '../api/client'
import { THEME } from '../theme'
import type { TodaySummary, WeekSummary, SyncStatus } from '../types/oura'

const W = Dimensions.get('window').width

// ── tiny label under each ring ────────────────────────────────────────────────
function RingLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={[styles.ringLabel, { color }]}>{label}</Text>
  )
}

export default function TodayScreen() {
  const [syncing, setSyncing] = useState(false)

  const today    = useQuery<TodaySummary>('today',  () => api.todaySummary())
  const week     = useQuery<WeekSummary>('week',    () => api.weekSummary())
  const syncStat = useQuery<SyncStatus>('syncStat', () => api.syncStatus())

  const loading  = today.loading && !today.data
  const anyError = today.error || week.error

  const onRefresh = useCallback(() => {
    invalidateCache()
    today.refetch()
    week.refetch()
    syncStat.refetch()
  }, [today, week, syncStat])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await api.triggerSync()
      // Give the backend a moment then refresh status
      await new Promise(r => setTimeout(r, 2000))
      syncStat.refetch()
    } catch {
      Alert.alert('Sync Error', 'Could not start sync. Check your API key in Settings.', [
        { text: 'OK' },
      ])
    } finally {
      setSyncing(false)
    }
  }, [syncStat])

  const scores = today.data?.scores
  const sleepScore     = scores?.sleep    ?? null
  const readinessScore = scores?.readiness ?? null
  const activityScore  = scores?.activity  ?? null

  // Build sparkline data from weekSummary
  const sleepSpark    = (week.data?.sleep    ?? []).map(d => ({ date: d.date, value: d.score }))
  const readySpark    = (week.data?.readiness ?? []).map(d => ({ date: d.date, value: d.score }))
  const activitySpark = (week.data?.activity  ?? []).map(d => ({ date: d.date, value: d.score }))

  const sparkW = W - 48  // accounts for horizontal padding

  const lastSync = syncStat.data?.last_sync
  const nextSync = syncStat.data?.next_sync
  const syncRunning = syncStat.data?.status === 'Running'

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={THEME.sleep} />
          <Text style={styles.loadingText}>Loading your data…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={today.loading || week.loading}
            onRefresh={onRefresh}
            tintColor={THEME.sleep}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good {greeting()}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        {/* Error banner */}
        {anyError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={14} color={THEME.error} />
            <Text style={styles.errorText}>
              {anyError === 'Network Error'
                ? 'Cannot reach backend — check Settings'
                : anyError}
            </Text>
          </View>
        ) : null}

        {/* Empty state */}
        {!loading && !anyError && sleepScore == null && readinessScore == null && activityScore == null ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color={THEME.muted} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyText}>
              Tap Sync Now to fetch your Oura data.
            </Text>
          </View>
        ) : null}

        {/* Score rings */}
        <View style={styles.ringsRow}>
          <View style={styles.ringCol}>
            <ScoreRing score={sleepScore} color={THEME.sleep} size={110} />
            <RingLabel label="Sleep" color={THEME.sleep} />
          </View>
          <View style={styles.ringCol}>
            <ScoreRing score={readinessScore} color={THEME.readiness} size={110} />
            <RingLabel label="Readiness" color={THEME.readiness} />
          </View>
          <View style={styles.ringCol}>
            <ScoreRing score={activityScore} color={THEME.activity} size={110} />
            <RingLabel label="Activity" color={THEME.activity} />
          </View>
        </View>

        {/* Sync controls */}
        <TouchableOpacity
          style={[styles.syncBtn, (syncing || syncRunning) && styles.syncBtnDisabled]}
          onPress={handleSync}
          disabled={syncing || syncRunning}
          activeOpacity={0.75}
        >
          {syncing || syncRunning ? (
            <>
              <ActivityIndicator size="small" color={THEME.activity} />
              <Text style={styles.syncBtnText}>Syncing…</Text>
            </>
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color={THEME.activity} />
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Last synced info */}
        <View style={styles.syncMeta}>
          <Text style={styles.syncMetaText}>
            {lastSync ? `Last sync: ${fmtDate(lastSync)}` : 'Never synced'}
          </Text>
          {nextSync ? (
            <Text style={styles.syncMetaText}>Next: {fmtDate(nextSync)}</Text>
          ) : null}
        </View>

        {/* 7-day sparklines */}
        {sleepSpark.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day Sleep</Text>
            <TrendChart data={sleepSpark} dataKey="value" color={THEME.sleep} height={70} width={sparkW} yDomain={[0, 100]} />
          </View>
        ) : null}

        {readySpark.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day Readiness</Text>
            <TrendChart data={readySpark} dataKey="value" color={THEME.readiness} height={70} width={sparkW} yDomain={[0, 100]} />
          </View>
        ) : null}

        {activitySpark.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day Activity</Text>
            <TrendChart data={activitySpark} dataKey="value" color={THEME.activity} height={70} width={sparkW} yDomain={[0, 100]} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function fmtDate(str: string) {
  try {
    return new Date(str).toLocaleString('en-IN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return str
  }
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
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
  header: {
    marginBottom: 24,
    marginTop: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
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
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  ringCol: {
    alignItems: 'center',
    gap: 8,
  },
  ringLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,152,0,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.25)',
    marginBottom: 10,
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  syncBtnText: {
    color: THEME.activity,
    fontSize: 14,
    fontWeight: '700',
  },
  syncMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  syncMetaText: {
    fontSize: 11,
    color: THEME.muted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: THEME.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
})
