/**
 * API client — React Native / Expo
 *
 * Key storage: expo-secure-store (encrypted, hardware-backed on device)
 * instead of localStorage used by the web app.
 * Base URL: EXPO_PUBLIC_API_URL env var (resolved at build time),
 * falls back to the production endpoint.
 */
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const KEY_STORAGE = 'oura_api_key'
const URL_STORAGE = 'oura_backend_url'
export const DEFAULT_URL = 'https://oura-api.stockmaniacs.net'

// ── Secure storage helpers ────────────────────────────────────────────────────
export async function getApiKey(): Promise<string> {
  return (await SecureStore.getItemAsync(KEY_STORAGE)) ?? ''
}
export async function setApiKey(key: string) {
  if (key) await SecureStore.setItemAsync(KEY_STORAGE, key)
  else await SecureStore.deleteItemAsync(KEY_STORAGE)
}
export async function hasApiKey(): Promise<boolean> {
  return !!(await getApiKey())
}

export async function getBackendUrl(): Promise<string> {
  const stored = await SecureStore.getItemAsync(URL_STORAGE)
  return stored || process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL
}
export async function setBackendUrl(url: string) {
  if (url && url !== DEFAULT_URL) await SecureStore.setItemAsync(URL_STORAGE, url)
  else await SecureStore.deleteItemAsync(URL_STORAGE)
}

// ── Axios instance with dynamic auth ─────────────────────────────────────────
export const http = axios.create({ timeout: 30_000 })

http.interceptors.request.use(async (config) => {
  config.baseURL = await getBackendUrl()
  const key = await getApiKey()
  if (key) config.headers['X-API-Key'] = key
  return config
})

// ── Typed endpoint wrappers ───────────────────────────────────────────────────
export const api = {
  health:       ()           => http.get('/api/v1/health'),
  todaySummary: ()           => http.get('/api/v1/summary/today'),
  weekSummary:  ()           => http.get('/api/v1/summary/week'),
  sleep:        (days = 14)  => http.get(`/api/v1/sleep?days=${days}`),
  readiness:    (days = 14)  => http.get(`/api/v1/readiness?days=${days}`),
  activity:     (days = 14)  => http.get(`/api/v1/activity?days=${days}`),
  hrv:          (days = 14)  => http.get(`/api/v1/hrv?days=${days}`),
  syncStatus:   ()           => http.get('/api/v1/sync/status'),
  triggerSync:  ()           => http.post('/api/v1/automation/sync'),
}
