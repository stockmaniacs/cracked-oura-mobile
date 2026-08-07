/**
 * ScoreRing — animated SVG ring (react-native-svg)
 * Same visual logic as web ScoreRing but using RN primitives.
 */
import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { COLORS, scoreColor, type Category } from '../types/oura'

interface Props {
  score: number | null
  category?: Category
  size?: number
  showLabel?: boolean
}

export function ScoreRing({ score, category, size = 140, showLabel = false }: Props) {
  const STROKE = size * 0.09
  const R = (size - STROKE) / 2
  const CX = size / 2
  const CY = size / 2
  const CIRC = 2 * Math.PI * R

  const animProgress = useRef(new Animated.Value(0)).current
  const targetProgress = score != null ? score / 100 : 0

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: targetProgress,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [targetProgress, animProgress])

  const color = scoreColor(score, category)

  const strokeDashoffset = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRC, 0],
  })

  // Animated.Circle not available — we use a JS-driven value
  // Workaround: re-render using state from Animated.Value listener
  const [dashOffset, setDashOffset] = React.useState(CIRC)
  useEffect(() => {
    const id = animProgress.addListener(({ value }) => {
      setDashOffset(CIRC * (1 - value))
    })
    return () => animProgress.removeListener(id)
  }, [animProgress, CIRC])

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={CX} cy={CY} r={R}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Glow */}
        <Circle
          cx={CX} cy={CY} r={R}
          stroke={color}
          strokeWidth={STROKE + 6}
          strokeOpacity={0.12}
          fill="none"
          strokeDasharray={`${CIRC - dashOffset} ${dashOffset}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90, ${CX}, ${CY})`}
        />
        {/* Progress */}
        <Circle
          cx={CX} cy={CY} r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRC - dashOffset} ${dashOffset}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90, ${CX}, ${CY})`}
        />
      </Svg>

      {/* Center label */}
      <View style={styles.label}>
        <Text style={[styles.score, { color, fontSize: size * 0.22 }]}>
          {score != null ? score : '–'}
        </Text>
        {showLabel && (
          <Text style={[styles.sub, { fontSize: size * 0.09 }]}>
            {score == null ? 'no data' : score >= 85 ? 'Optimal' : score >= 70 ? 'Good' : score >= 60 ? 'Fair' : 'Low'}
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  label:     { position: 'absolute', alignItems: 'center' },
  score:     { fontWeight: '700', letterSpacing: -1 },
  sub:       { color: '#8899aa', marginTop: 2 },
})
