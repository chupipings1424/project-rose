import type { ReactNode } from 'react'

export type Tone = 'default' | 'ok' | 'warn' | 'danger' | 'accent'

interface StatTileProps {
  label: string
  value: ReactNode
  tone?: Tone
  hint?: ReactNode
}

export function StatTile({ label, value, tone = 'default', hint }: StatTileProps) {
  return (
    <div className={`stat tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}