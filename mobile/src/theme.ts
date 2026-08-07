/** Shared design tokens — mirrors web/src/index.css dark theme */
export const THEME = {
  bg:         '#0F0F1A',   // hsl(240 48% 8%)
  card:       '#16213E',   // hsl(220 46% 17%)
  surface:    '#1A1A2E',   // hsl(240 29% 14%)
  border:     'rgba(255,255,255,0.07)',

  text:       '#E8EAF0',
  muted:      '#8899aa',

  sleep:      '#4CC9F0',
  readiness:  '#4CAF50',
  activity:   '#FF9800',
  hrv:        '#AB47BC',

  good:       '#4CC9F0',
  fair:       '#F59E0B',
  poor:       '#EF4444',
} as const

export type ThemeColor = typeof THEME[keyof typeof THEME]
