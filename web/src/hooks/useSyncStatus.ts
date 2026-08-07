// Polls sync status every 60 s. Used by Layout for the status dot.
import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import type { SyncStatus } from '@/types/oura'
import { hasApiKey } from '@/store/apiKey'

export function useSyncStatus() {
  const [status, setStatus]   = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!hasApiKey()) return
    try {
      const r = await api.syncStatus()
      setStatus(r.data)
      setError(null)
    } catch {
      setError('Cannot reach backend')
    }
  }, [])

  useEffect(() => {
    fetch()
    const t = setInterval(fetch, 60_000)
    return () => clearInterval(t)
  }, [fetch])

  const triggerSync = async () => {
    setSyncing(true)
    try {
      await api.triggerSync()
      await new Promise(r => setTimeout(r, 2000))
      await fetch()
    } catch {
      setError('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return { status, syncing, error, triggerSync, refetch: fetch }
}
