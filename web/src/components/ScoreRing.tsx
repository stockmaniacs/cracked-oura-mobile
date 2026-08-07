// Animated SVG score ring.
// Fills smoothly on mount via CSS transition on stroke-dashoffset.

import { useEffect, useState } from 'react'
import { scoreColor, scoreLabel, type Category } from '@/types/oura'
import { cn } from '@/lib/utils'

interface ScoreRingProps {
  score: number | null
  category?: Category
  label?: string
  /** Diameter in px */
  size?: number
  strokeWidth?: number
  /** Show the score label below the number */
  showLabel?: boolean
  className?: string
}

const R  = 45
const CX = 60
const CY = 60
const CIRCUMFERENCE = 2 * Math.PI * R

export function ScoreRing({
  score,
  category,
  label,
  size = 140,
  strokeWidth = 9,
  showLabel = false,
  className,
}: ScoreRingProps) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score ?? 0), 80)
    return () => clearTimeout(t)
  }, [score])

  const color  = scoreColor(score, category)
  const offset = CIRCUMFERENCE * (1 - animated / 100)
  const fontSize = size * 0.24

  return (
    <div
      className={cn('relative inline-flex flex-col items-center gap-2', className)}
    >
      <div style={{ width: size, height: size, position: 'relative' }}>
        <svg viewBox="0 0 120 120" width={size} height={size}>
          {/* Track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.25,0.46,0.45,0.94), stroke 0.4s' }}
          />
          {/* Glow (subtle) */}
          {score != null && score > 0 && (
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth + 6}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              opacity={0.12}
              style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.25,0.46,0.45,0.94)' }}
            />
          )}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
          <span
            className="font-bold leading-none tabular-nums"
            style={{ color, fontSize }}
          >
            {score != null ? score : '–'}
          </span>
          {label && (
            <span className="text-muted-foreground mt-1 leading-none" style={{ fontSize: size * 0.095 }}>
              {label}
            </span>
          )}
        </div>
      </div>

      {showLabel && score != null && (
        <span className="text-xs font-medium" style={{ color }}>
          {scoreLabel(score)}
        </span>
      )}
    </div>
  )
}
