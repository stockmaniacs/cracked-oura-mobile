import { NavLink, useLocation } from 'react-router-dom'
import { Sun, BedDouble, Activity, Heart, Settings, RefreshCw, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSyncStatus } from '@/hooks/useSyncStatus'
import { hasApiKey } from '@/store/apiKey'

const NAV = [
  { to: '/today',     icon: Sun,       label: 'Today'     },
  { to: '/sleep',     icon: BedDouble, label: 'Sleep'     },
  { to: '/readiness', icon: Heart,     label: 'Readiness' },
  { to: '/activity',  icon: Activity,  label: 'Activity'  },
  { to: '/settings',  icon: Settings,  label: 'Settings'  },
]

function SyncDot({ status, syncing }: { status: string | null; syncing: boolean }) {
  if (syncing) return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Syncing…" />
  if (!hasApiKey() || status === null) return <span className="inline-block w-2 h-2 rounded-full bg-white/20" title="No data" />
  if (status === 'Running') return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Syncing…" />
  if (status === 'Error')   return <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Sync error" />
  return <span className="inline-block w-2 h-2 rounded-full bg-readiness" title="Up to date" />
}

function fmtSyncTime(ts: string | null): string {
  if (!ts) return 'Never synced'
  const d = new Date(ts)
  const now = new Date()
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1)  return 'Just synced'
  if (diffMin < 60) return `${diffMin}m ago`
  const h = Math.round(diffMin / 60)
  if (h < 24) return `${h}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { status, syncing, triggerSync } = useSyncStatus()
  const location = useLocation()

  // Current page title for mobile header
  const currentNav = NAV.find(n => location.pathname.startsWith(n.to))

  return (
    <div className="flex flex-col h-screen bg-background text-foreground md:flex-row overflow-hidden">

      {/* ── Desktop: Left sidebar ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/5 bg-surface py-5">
        {/* Logo */}
        <div className="px-4 mb-6 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sleep/20 flex items-center justify-center">
            <Zap size={14} className="text-sleep" />
          </div>
          <span className="font-bold text-sm tracking-wide text-foreground">OuraFree</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-sleep/10 text-sleep'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
              )}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sync status */}
        <div className="px-4 mt-4 pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <SyncDot status={status?.status ?? null} syncing={syncing} />
            <span className="text-xs text-muted-foreground">{fmtSyncTime(status?.last_sync ?? null)}</span>
          </div>
          <button
            onClick={triggerSync}
            disabled={syncing || !hasApiKey()}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium
              bg-white/5 hover:bg-white/10 disabled:opacity-40 text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-white/5 bg-surface/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-sleep/20 flex items-center justify-center">
              <Zap size={11} className="text-sleep" />
            </div>
            <span className="font-bold text-sm text-foreground">{currentNav?.label ?? 'OuraFree'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <SyncDot status={status?.status ?? null} syncing={syncing} />
              <span className="text-[10px] text-muted-foreground">{fmtSyncTime(status?.last_sync ?? null)}</span>
            </div>
            <button
              onClick={triggerSync}
              disabled={syncing || !hasApiKey()}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors"
              aria-label="Sync"
            >
              <RefreshCw size={14} className={cn('text-muted-foreground', syncing && 'animate-spin')} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 no-scrollbar">
          <div className="max-w-2xl mx-auto px-4 py-5 md:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile: Bottom tab bar ────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-white/5 bg-surface/95 backdrop-blur">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-sleep' : 'text-muted-foreground',
            )}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
