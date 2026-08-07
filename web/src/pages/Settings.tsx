import { useState, useEffect } from 'react'
import { getApiKey, setApiKey, getBackendUrl, setBackendUrl, DEFAULT_URL, hasApiKey } from '@/store/apiKey'
import { api } from '@/api/client'
import { invalidateCache } from '@/hooks/useOuraData'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { ErrorBanner } from '@/components/ErrorBanner'
import { COLORS } from '@/types/oura'
import { Eye, EyeOff, CheckCircle2, XCircle, Wifi, RefreshCw, Database } from 'lucide-react'

type ConnectionState = 'idle' | 'testing' | 'ok' | 'fail'

export default function Settings() {
  const [keyInput,   setKeyInput]   = useState(getApiKey())
  const [urlInput,   setUrlInput]   = useState(getBackendUrl())
  const [showKey,    setShowKey]    = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [connState,  setConnState]  = useState<ConnectionState>('idle')
  const [connMsg,    setConnMsg]    = useState('')

  const { status, syncing, error: syncError, triggerSync, refetch } = useSyncStatus()

  // Refresh status on mount
  useEffect(() => { refetch() }, [refetch])

  const handleSave = () => {
    setApiKey(keyInput.trim())
    setBackendUrl(urlInput.trim())
    invalidateCache()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleTestConnection = async () => {
    setConnState('testing')
    setConnMsg('')
    try {
      const r = await api.health()
      setConnState('ok')
      setConnMsg(`v${r.data.version} — ${r.data.service}`)
    } catch (e: unknown) {
      setConnState('fail')
      const err = e as { message?: string }
      setConnMsg(err?.message ?? 'Connection failed')
    }
  }

  const totalRecords = status?.record_counts
    ? Object.values(status.record_counts).reduce((s, v) => s + v, 0)
    : null

  const fmtTs = (ts: string | null) => {
    if (!ts) return '–'
    const d = new Date(ts)
    return d.toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ── API Key ── */}
      <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-4">
        <p className="text-sm font-semibold">API Key</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The <code className="px-1 py-0.5 rounded bg-white/5 text-xs">SECRET_KEY</code> from the
          backend <code className="px-1 py-0.5 rounded bg-white/5 text-xs">.env</code>.
          Stored in your browser's localStorage — never transmitted anywhere else.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="Paste SECRET_KEY…"
              className="w-full rounded-xl border border-white/8 bg-surface px-3 py-2.5 pr-9 text-sm
                outline-none focus:ring-2 focus:ring-sleep/40 transition-all placeholder:text-muted-foreground"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Backend URL */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Backend URL</p>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder={DEFAULT_URL}
            className="w-full rounded-xl border border-white/8 bg-surface px-3 py-2.5 text-sm
              outline-none focus:ring-2 focus:ring-sleep/40 transition-all placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all
              bg-sleep/15 hover:bg-sleep/25 text-sleep"
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
          <button
            onClick={handleTestConnection}
            disabled={connState === 'testing'}
            className="flex items-center gap-1.5 px-4 rounded-xl py-2.5 text-sm font-medium transition-all
              bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Wifi size={14} className={connState === 'testing' ? 'animate-pulse' : ''} />
            Test
          </button>
        </div>

        {/* Connection result */}
        {connState === 'ok' && (
          <div className="flex items-center gap-2 text-xs text-readiness">
            <CheckCircle2 size={14} /> Connected · {connMsg}
          </div>
        )}
        {connState === 'fail' && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <XCircle size={14} /> {connMsg}
          </div>
        )}
      </div>

      {/* ── Sync ── */}
      <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Data Sync</p>

        {syncError && <ErrorBanner message={syncError} onRetry={refetch} />}

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: 'Status',    value: status?.status ?? '–' },
            { label: 'Last sync', value: fmtTs(status?.last_sync ?? null) },
            { label: 'Next sync', value: fmtTs(status?.next_sync ?? null) },
            { label: 'Scheduled', value: status?.schedule_time ?? '–' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-muted-foreground">{label}</p>
              <p className="font-medium text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <button
          onClick={triggerSync}
          disabled={syncing || !hasApiKey()}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all
            bg-activity/15 hover:bg-activity/25 text-activity disabled:opacity-40"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        {!hasApiKey() && <p className="text-xs text-muted-foreground text-center">Save an API key first.</p>}
      </div>

      {/* ── Database ── */}
      {status?.record_counts && (
        <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Database size={14} className="text-muted-foreground" /> Database
            </p>
            {totalRecords != null && (
              <span className="text-xs text-muted-foreground">
                {totalRecords.toLocaleString()} total records
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(status.record_counts).map(([table, count]) => (
              <div key={table} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground capitalize">{table.replace(/_/g,' ')}</span>
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: count > 0 ? COLORS.readiness : 'hsl(215 20% 55%)' }}
                >
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Theme (placeholder) ── */}
      <div className="rounded-2xl border border-white/5 bg-card p-4 space-y-2">
        <p className="text-sm font-semibold">Appearance</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Theme</p>
            <p className="text-xs text-muted-foreground">Light mode coming soon</p>
          </div>
          <div className="rounded-xl px-3 py-1.5 bg-white/5 text-xs text-muted-foreground cursor-not-allowed">
            Dark
          </div>
        </div>
      </div>

      {/* App version */}
      <p className="text-center text-xs text-muted-foreground/50 pb-2">OuraFree v1.0.0</p>
    </div>
  )
}
