import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { THEME } from '../theme'

export default function ReadinessScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Readiness</Text>
      <Text style={styles.sub}>— coming soon —</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title:     { fontSize: 28, fontWeight: '700', color: THEME.readiness, marginBottom: 8 },
  sub:       { fontSize: 14, color: THEME.muted },
})
