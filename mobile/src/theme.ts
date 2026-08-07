/** Shared design tokens — mirrors web/src/index.css dark theme */
export const THEME = {
  // Backgrounds
  background: '#0F0F1A',
  surface:    '#1A1A2E',
  card:       '#16213E',
  border:     'rgba(255,255,255,0.07)',

  // Alias kept for backward compat
  bg:         '#0F0F1A',

  // Text
  text:          '#FFFFFF',
  textSecondary: '#B0BEC5',
  muted:         '#8899aa',

  // Category colours
  sleep:     '#4CC9F0',
  readiness: '#4CAF50',
  activity:  '#FF9800',
  hrv:       '#AB47BC',

  // Status colours
  error:  '#EF5350',
  good:   '#4CC9F0',
  fair:   '#F59E0B',
  poor:   '#EF4444',
} as const

export type ThemeColor = typeof THEME[keyof typeof THEME]
