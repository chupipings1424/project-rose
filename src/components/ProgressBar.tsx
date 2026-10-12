export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  )
}