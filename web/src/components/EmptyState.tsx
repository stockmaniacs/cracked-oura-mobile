interface EmptyStateProps {
  title?: string
  message?: string
  icon?: string
}

export function EmptyState({
  title = 'No data yet',
  message = 'Sync your Oura ring data to get started.',
  icon = '💍',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="text-6xl mb-4 opacity-60">{icon}</div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  )
}
