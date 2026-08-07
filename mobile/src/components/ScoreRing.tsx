/**
 * ScoreRing — animated SVG ring using Reanimated + react-native-svg.
 * Props: score (0-100 | null), color (hex), size, label (below score).
 */
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated'
import { THEME } from '../theme'

interface Props {
  score: number | null
  color: string
  size?: number
  label?: string
}

export function ScoreRing({ score, color, size = 140, label }: Props) {
  const STROKE = Math.max(10, size * 0.09)
  const R      = (size - STROKE) / 2
  const CX     = size / 2
  const CY     = size / 2
  const CIRC   = 2 * Math.PI * R

  // Reanimated shared value drives the animation on the UI thread
  const progress = useSharedValue(0)

  // JS-thread state for SVG (SVG can't be driven from UI thread directly)
  const [dashOffset, setDashOffset] = useState(CIRC)

  // Bridge UI-thread progress → JS-thread state for SVG rendering
  useAnimatedReaction(
    () => progress.value,
    (value) => {
      runOnJS(setDashOffset)(CIRC * (1 - value))
    },
  )

  useEffect(() => {
    const target = score != null ? score / 100 : 0
    progress.value = withTiming(target, {
      duration: 1100,
      easing: Easing.out(Easing.cubic),
    })
  }, [score]) // eslint-disable-line react-hooks/exhaustive-deps

  const filled  = CIRC - dashOffset
  const gapSize = dashOffset

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track ring */}
        <Circle
          cx={CX} cy={CY} r={R}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Glow halo */}
        <Circle
          cx={CX} cy={CY} r={R}
          stroke={color}
          strokeWidth={STROKE + 6}
          strokeOpacity={0.12}
          fill="none"
          strokeDasharray={`${filled} ${gapSize}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${CX}, ${CY})`}
        />
        {/* Progress arc */}
        <Circle
          cx={CX} cy={CY} r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${filled} ${gapSize}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${CX}, ${CY})`}
        />
      </Svg>

      {/* Center text */}
      <View style={styles.center}>
        <Text style={[styles.score, { color, fontSize: size * 0.22 }]}>
          {score != null ? score : '–'}
        </Text>
        {label ? (
          <Text style={[styles.label, { fontSize: size * 0.1 }]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  score: {
    fontWeight: '700',
    letterSpacing: -1,
  },
  label: {
    color: THEME.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
})
