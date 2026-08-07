import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'

const PALETTE = ['#4CC9F0','#4CAF50','#FF9800','#AB47BC','#F59E0B','#EF4444']

function fmtDate(label: string) {
  if (!label) return ''
  if (label.includes('T')) {
    const d = new Date(label)
    return d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false })
  }
  const [y, m, d] = label.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

interface TrendChartProps {
  data: Array<Record<string, unknown>>
  dataKey?: string
  dataKeys?: string[]
  color?: string
  showPoints?: boolean
  height?: number
  className?: string
  yDomain?: [number, number]
}

export function TrendChart({ data, dataKey, dataKeys, color = PALETTE[0], showPoints = false, height = 200, className, yDomain }: TrendChartProps) {
  const keys = dataKeys?.length ? dataKeys : dataKey ? [dataKey] : []
  const colors = [color, ...PALETTE.filter(c => c !== color)]
  const multi = keys.length > 1

  if (!keys.length || !data.length) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground text-sm ${className ?? ''}`} style={{ height }}>
        No data
      </div>
    )
  }

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
            tickLine={false} axisLine={false} minTickGap={44}
          />
          <YAxis
            domain={yDomain ?? ['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
            tickLine={false} axisLine={false}
          />
          <Tooltip
            contentStyle={{ backgroundColor:'#1A1A2E', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:12 }}
            labelStyle={{ color:'hsl(210 40% 95%)', marginBottom:4 }}
            itemStyle={{ color:'hsl(210 40% 85%)' }}
            labelFormatter={(label: unknown) => fmtDate(String(label ?? ''))}
          />
          {multi && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={showPoints ? { r:3, fill: colors[i % colors.length] } : false}
              activeDot={{ r:5 }}
              connectNulls
              name={String(k).split('.').pop()?.replace(/_/g,' ') ?? k}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
