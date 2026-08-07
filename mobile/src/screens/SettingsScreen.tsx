/**
 * SettingsScreen — API key, backend URL, connection test, sync controls.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  getApiKey, setApiKey,
  getBackendUrl, setBackendUrl,
  DEFAULT_URL, api,
} from '../api/client'
import { useQuery } from '../hooks/useOuraData'
import { THEME } from '../theme'
import type { SyncStatus } from '../types/oura'

export default function SettingsScreen() {
  const [apiKey,     setApiKeyLocal]  = useState('')
  const [backendUrl, setBackendUrlLocal] = useState(DEFAULT_URL)
  const [saving,     setSaving]       = useState(false)
  const [testing,    setTesting]      = useState(false)
  const [syncing,    setSyncing]      = useState(false)
  const [keyMasked,  setKeyMasked]    = useState(true)
  const [loaded,     setLoaded]       = useState(false)

  // Load persisted values on mount
  useEffect(() => {
    Promise.all([getApiKey(), getBackendUrl()]).then(([key, url]) => {
      if (key) setApiKeyLocal(key)
      setBackendUrlLocal(url)
      setLoaded(true)
    })
  }, [])

  // Sync status polling
  const syncQ = useQuery<SyncStatus>('syncStat', () => api.syncStatus())

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await setApiKey(apiKey.trim())
      await setBackendUrl(backendUrl.trim())
      Alert.alert('Saved', 'Settings saved successfully.')
    } catch {
      Alert.alert('Error', 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }, [apiKey, backendUrl])

  const handleTest = useCallback(async () => {
    if (!apiKey.trim()) {
      Alert.alert('Missing API Key', 'Enter your API key first.')
      return
    }
    setTesting(true)
    try {
      // Persist temporarily so the interceptor picks it up
      await setApiKey(apiKey.trim())
      await setBackendUrl(backendUrl.trim())
      const res = await api.health()
      const data = res.data as { status?: string; service?: string }
      Alert.alert(
        '✅ Connected',
        `Service: ${data?.service ?? 'Oura API'}\nStatus: ${data?.status ?? 'ok'}`,
      )
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Unknown error'
      Alert.alert('❌ Connection Failed', `Could not reach backend.\n\n${msg}`, [
        { text: 'OK' },
        { text: 'Check Settings', style: 'cancel' },
      ])
    } finally {
      setTesting(false)
    }
  }, [apiKey, backendUrl])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await api.triggerSync()
      await new Promise(r => setTimeout(r, 1500))
      syncQ.refetch()
      Alert.alert('Sync Started', 'Background sync has been triggered.')
    } catch {
      Alert.alert('Sync Error', 'Could not trigger sync. Ensure your API key is saved.')
    } finally {
      setSyncing(false)
    }
  }, [syncQ])

  const syncStatus = syncQ.data
  const isRunning  = syncStatus?.status === 'Running'

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={THEME.sleep} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.screenTitle}>Settings</Text>

          {/* API Key */}
          <SectionHeader label="API Key" icon="key-outline" />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKeyLocal}
              placeholder="Paste your secret key here"
              placeholderTextColor={THEME.muted}
              secureTextEntry={keyMasked}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={THEME.sleep}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setKeyMasked(v => !v)}
            >
              <Ionicons
                name={keyMasked ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={THEME.muted}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Find your key in the backend config or generate one with the CLI.
          </Text>

          {/* Backend URL */}
          <SectionHeader label="Backend URL" icon="server-outline" />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={backendUrl}
              onChangeText={setBackendUrlLocal}
              placeholder={DEFAULT_URL}
              placeholderTextColor={THEME.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              selectionColor={THEME.sleep}
            />
          </View>
          <Text style={styles.hint}>
            Default: {DEFAULT_URL}
          </Text>

          {/* Save button */}
          <ActionButton
            label="Save Settings"
            icon="save-outline"
            color={THEME.sleep}
            loading={saving}
            onPress={handleSave}
          />

          {/* Test connection */}
          <ActionButton
            label="Test Connection"
            icon="wifi-outline"
            color={THEME.readiness}
            loading={testing}
            onPress={handleTest}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sync section */}
          <SectionHeader label="Data Sync" icon="sync-outline" />

          {/* Sync status card */}
          <View style={styles.statusCard}>
            <StatusRow label="Status" value={syncStatus?.status ?? '–'} highlight={isRunning} />
            <StatusRow label="Last Sync" value={fmtDateTime(syncStatus?.last_sync)} />
            <StatusRow label="Next Sync" value={fmtDateTime(syncStatus?.next_sync)} />
            <StatusRow label="Schedule" value={syncStatus?.schedule_time ?? '–'} />
          </View>

          {/* Record counts */}
          {syncStatus?.record_counts ? (
            <View style={styles.statusCard}>
              <Text style={styles.countTitle}>Records in DB</Text>
              <View style={styles.countsGrid}>
                {Object.entries(syncStatus.record_counts).map(([k, v]) => (
                  <View key={k} style={styles.countItem}>
                    <Text style={styles.countValue}>{v}</Text>
                    <Text style={styles.countLabel}>{k}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Sync Now button */}
          <ActionButton
            label={isRunning ? 'Sync Running…' : 'Sync Now'}
            icon="refresh-outline"
            color={THEME.activity}
            loading={syncing || isRunning}
            onPress={handleSync}
            disabled={isRunning}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Shared mini components ────────────────────────────────────────────────────

function SectionHeader({ label, icon }: { label: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={14} color={THEME.muted} />
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
    </View>
  )
}

function ActionButton({
  label, icon, color, loading, onPress, disabled = false,
}: {
  label: string
  icon: string
  color: string
  loading?: boolean
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: `${color}40` }, (disabled || loading) && styles.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={16} color={color} />
      )}
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

function StatusRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, highlight && styles.statusRunning]}>{value}</Text>
    </View>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(str: string | null | undefined): string {
  if (!str) return '–'
  try {
    return new Date(str).toLocaleString('en-IN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
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
    paddingBottom: 60,
    paddingTop: 8,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
    letterSpacing: -0.5,
    marginBottom: 24,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: THEME.muted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 6,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: THEME.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  hint: {
    fontSize: 11,
    color: THEME.muted,
    marginBottom: 16,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.card,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 20,
  },
  statusCard: {
    backgroundColor: THEME.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: THEME.muted,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
  },
  statusRunning: {
    color: THEME.readiness,
  },
  countTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: THEME.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  countsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countItem: {
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 64,
  },
  countValue: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.sleep,
  },
  countLabel: {
    fontSize: 9,
    color: THEME.muted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
})
