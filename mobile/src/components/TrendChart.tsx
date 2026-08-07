/**
 * TrendChart — line chart using react-native-gifted-charts.
 * Lightweight, no native linking, works iOS + Android.
 */
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LineChart } from 'react-native-gifted-charts'
import { THEME } from '../theme'

interface DataPoint {
  date: string
  [key: string]: unknown
}

interface Props {
  data: DataPoint[]
  dataKey: string
  color?: string
  height?: number
  yDomain?: [number, number]
  width?: number
}

export function TrendChart({ data, dataKey, color = '#4CC9F0', height = 160, yDomain, width = 300 }: Props) {
  if (!data.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    )
  }

  const chartData = data.map(d => ({
    value: (d[dataKey] as number | null) ?? 0,
    dataPointText: '',
  }))

  const maxVal = yDomain ? yDomain[1] : Math.max(...chartData.map(d => d.value), 1)
  const minVal = yDomain ? yDomain[0] : Math.min(...chartData.map(d => d.value), 0)

  return (
    <View style={{ height }}>
      <LineChart
        data={chartData}
        width={width}
        height={height - 24}
        color={color}
        thickness={2}
        startFillColor={color}
        endFillColor="transparent"
        startOpacity={0.15}
        endOpacity={0}
        areaChart
        curved
        hideDataPoints
        hideRules={false}
        rulesColor="rgba(255,255,255,0.05)"
        rulesType="solid"
        yAxisColor="transparent"
        xAxisColor="transparent"
        yAxisTextStyle={{ color: THEME.muted, fontSize: 9 }}
        maxValue={maxVal}
        noOfSections={4}
        backgroundColor="transparent"
        initialSpacing={4}
        endSpacing={4}
        pointerConfig={{
          pointerStripHeight: height - 24,
          pointerStripColor: 'rgba(255,255,255,0.1)',
          pointerStripWidth: 1,
          pointerColor: color,
          radius: 4,
          pointerLabelWidth: 70,
          pointerLabelHeight: 36,
          activatePointersOnLongPress: false,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (items: Array<{ value: number }>) => (
            <View style={styles.tooltip}>
              <Text style={[styles.tooltipText, { color }]}>{items[0]?.value ?? '–'}</Text>
            </View>
          ),
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: THEME.muted,
    fontSize: 13,
  },
  tooltip: {
    backgroundColor: THEME.surface,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tooltipText: {
    fontSize: 13,
    fontWeight: '700',
  },
})
