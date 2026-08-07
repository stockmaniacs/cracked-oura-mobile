import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { THEME } from '../theme'

interface Props {
  title: string
  value: string | number | null | undefined
  unit?: string
  subtitle?: string
  color?: string
  loading?: boolean
}

export function StatCard({ title, value, unit, subtitle, color = THEME.text, loading = false }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {loading ? (
        <View style={styles.skeleton} />
      ) : (
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
            {value ?? '–'}
          </Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
      )}
      {subtitle && !loading ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: THEME.muted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 11,
    color: THEME.muted,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.muted,
  },
  skeleton: {
    height: 30,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
})
