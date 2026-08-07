import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { THEME } from '../theme'

interface Props {
  onPress: () => void
  syncing?: boolean
  disabled?: boolean
  label?: string
}

export function SyncButton({ onPress, syncing = false, disabled = false, label = 'Sync Now' }: Props) {
  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || syncing) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || syncing}
      activeOpacity={0.75}
    >
      {syncing
        ? <ActivityIndicator size="small" color={THEME.activity} />
        : <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: THEME.activity,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
})
