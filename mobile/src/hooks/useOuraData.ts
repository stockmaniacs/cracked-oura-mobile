/**
 * useOuraData — generic data-fetching hook for React Native.
 *
 * Same pattern as web/src/hooks/useOuraData.ts but:
 *  - uses an in-memory module-level cache (no localStorage)
 *  - async API key check on mount
 *  - compatible with React Native's no-window environment
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { AxiosResponse } from 'axios'

// ── In-memory cache ───────────────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> { data: T; ts: number }
const cache = new Map<string, CacheEntry<unknown>>()

export function invalidateCache(prefix?: string) {
  if (!prefix) { cache.clear(); return }
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k)
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useQuery<T>(
  key: string,
  fetcher: () => Promise<AxiosResponse<T>>,
  enabled = true,
): QueryState<T> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: enabled, error: null })
  const fetchRef = useRef(fetcher)
  fetchRef.current = fetcher

  const run = useCallback(async (force = false) => {
    if (!force) {
      const hit = cache.get(key)
      if (hit && Date.now() - hit.ts < CACHE_TTL) {
        setState({ data: hit.data as T, loading: false, error: null })
        return
      }
    }
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetchRef.current()
      cache.set(key, { data: res.data, ts: Date.now() })
      setState({ data: res.data, loading: false, error: null })
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Request failed'
      setState(s => ({ ...s, loading: false, error: msg }))
    }
  }, [key])

  useEffect(() => {
    if (enabled) run()
  }, [enabled, run])

  return { ...state, refetch: () => run(true) }
}
