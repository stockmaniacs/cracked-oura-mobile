const KEY_STORAGE  = 'oura_api_key'
const URL_STORAGE  = 'oura_backend_url'
const DEFAULT_URL  = 'https://oura-api.stockmaniacs.net'

// ── API key ───────────────────────────────────────────────────────────────────
export function getApiKey(): string  { return localStorage.getItem(KEY_STORAGE) ?? '' }
export function setApiKey(k: string) { k ? localStorage.setItem(KEY_STORAGE, k) : localStorage.removeItem(KEY_STORAGE) }
export function hasApiKey(): boolean { return !!getApiKey() }

// ── Backend URL ───────────────────────────────────────────────────────────────
export function getBackendUrl(): string {
  return (
    localStorage.getItem(URL_STORAGE) ||
    (import.meta.env.VITE_API_URL as string) ||
    DEFAULT_URL
  )
}
export function setBackendUrl(url: string) {
  url && url !== DEFAULT_URL
    ? localStorage.setItem(URL_STORAGE, url)
    : localStorage.removeItem(URL_STORAGE)
}
export { DEFAULT_URL }
