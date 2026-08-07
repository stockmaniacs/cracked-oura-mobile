/**
 * StatCard — dark metric tile with optional Ionicons icon and accent border.
 */
import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { THEME } from '../theme'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface Props {
  title: string
  value: string | number | null | undefined
  unit?: string
  subtitle?: string
  iconName?: IoniconsName
  accentColor?: string
  loading?: boolean
}

export function StatCard({
  title,
  value,
  unit,
  subtitle,
  iconName,
  accentColor = THEME.sleep,
  loading = false,
}: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      {/* Header row: icon + title */}
      <View style={styles.header}>
        {iconName ? (
          <Ionicons name={iconName} size={13} color={accentColor} style={styles.icon} />
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title.toUpperCase()}
        </Text>
      </View>

      {/* Value */}
      {loading ? (
        <ActivityIndicator size="small" color={accentColor} style={styles.loader} />
      ) : (
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: accentColor }]} numberOfLines={1} adjustsFontSizeToFit>
            {value ?? '–'}
          </Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>
      )}

      {subtitle && !loading ? (
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  icon: {
    marginTop: 1,
  },
  title: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: THEME.muted,
    flexShrink: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 22,
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
  loader: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
})
