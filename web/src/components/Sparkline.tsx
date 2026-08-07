// Minimal line sparkline — no axes, no labels. Uses recharts.

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface SparklineProps {
  data: Array<{ date: string; value: number | null }>
  color?: string
  height?: number
}

export function Sparkline({ data, color = '#4CC9F0', height = 40 }: SparklineProps) {
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <div className="rounded-lg border border-white/10 bg-surface px-2 py-1 text-xs font-medium text-foreground shadow-lg">
                {payload[0].value}
              </div>
            ) : null
          }
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
