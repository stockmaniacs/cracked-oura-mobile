// 270° arc progress ring for step count.
// Gap at bottom (like a speedometer). Orange fill.

import { useEffect, useState } from 'react'
import { COLORS } from '@/types/oura'

interface StepsRingProps {
  steps: number | null
  goal?: number
  size?: number
  strokeWidth?: number
}

const R           = 46
const CX          = 60
const CY          = 60
const CIRC        = 2 * Math.PI * R
const ARC         = CIRC * 0.75          // 270° of the full circumference
const GAP         = CIRC - ARC           // 90° gap at bottom
const ROTATE      = 135                  // start at ~7:30, end at ~4:30

export function StepsRing({ steps, goal = 10_000, size = 200, strokeWidth = 11 }: StepsRingProps) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(steps ?? 0), 80)
    return () => clearTimeout(t)
  }, [steps])

  const pct    = Math.min(animated / goal, 1)
  const filled = ARC * pct
  const color  = COLORS.activity

  // Percentage display
  const pctDisplay = steps != null ? Math.round((steps / goal) * 100) : null

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${GAP}`}
          transform={`rotate(${ROTATE} ${CX} ${CY})`}
        />
        {/* Progress */}
        {filled > 0 && (
          <>
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${CIRC - filled}`}
              transform={`rotate(${ROTATE} ${CX} ${CY})`}
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' }}
            />
            {/* Glow */}
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth + 8}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${CIRC - filled}`}
              transform={`rotate(${ROTATE} ${CX} ${CY})`}
              opacity={0.1}
            />
          </>
        )}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
        <span className="text-3xl font-bold tabular-nums leading-none" style={{ color }}>
          {steps != null ? steps.toLocaleString() : '–'}
        </span>
        <span className="text-xs text-muted-foreground mt-1">steps</span>
        {pctDisplay != null && (
          <span className="text-xs font-medium mt-0.5" style={{ color }}>
            {pctDisplay}% of goal
          </span>
        )}
      </div>
    </div>
  )
}
