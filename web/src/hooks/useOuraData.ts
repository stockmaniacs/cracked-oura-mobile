// Generic fetch + cache hook for all Oura data endpoints.
// Caches responses in a module-level Map so navigating between pages
// doesn't re-fetch within the same session.

import { useState, useEffect, useRef } from 'react'

interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// Simple in-memory cache keyed by cache key string
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000   // 5 min

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, ts: Date.now() })
}

// Low-level hook — pass any async fetcher function
export function useQuery<T>(
  key: string,
  fetcher: () => Promise<{ data: T }>,
  enabled = true,
): QueryState<T> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({
    data: getCached<T>(key),
    loading: !getCached<T>(key) && enabled,
    error: null,
  })

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const version = useRef(0)

  const run = () => {
    if (!enabled) return
    const v = ++version.current
    const cached = getCached<T>(key)
    if (cached) {
      setState({ data: cached, loading: false, error: null })
      return
    }
    setState(s => ({ ...s, loading: true, error: null }))
    fetcherRef.current()
      .then(res => {
        if (v !== version.current) return
        setCached(key, res.data)
        setState({ data: res.data, loading: false, error: null })
      })
      .catch(err => {
        if (v !== version.current) return
        const msg = err?.response?.data?.detail ?? err?.message ?? 'Unknown error'
        setState(s => ({ ...s, loading: false, error: msg }))
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, [key, enabled])

  return { ...state, refetch: () => { cache.delete(key); run() } }
}

// Convenience: invalidate all cached entries (e.g. after a sync)
export function invalidateCache(): void {
  cache.clear()
}
