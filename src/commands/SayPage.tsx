import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CommandBar from './CommandBar'

/**
 * /say - the "widget" screen. A web app can't put a widget on the home screen, so
 * the phone opens this page instead:
 * - iPhone: a Shortcut dictates what you say and opens /say?text=kape%2050.
 * - Android: long-press the ROSE icon -> "Say a command", then tap the mic.
 * Nothing is saved until you check the preview and tap Save.
 */
export default function SayPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [initialText] = useState(() => params.get('text')?.trim() ?? '')

  // Drop ?text= from the address so a reload doesn't show the same preview again.
  useEffect(() => {
    if (params.has('text')) navigate('/say', { replace: true })
  }, [params, navigate])

  return (
    <div className="say-page">
      <header className="today-head">
        <p className="eyebrow">Type or say it</p>
        <h1 className="display">Say it</h1>
      </header>
      <CommandBar initialText={initialText} onSaved={() => navigate('/today')} />
      <p className="muted small">
        e.g. &quot;kape 50&quot;, &quot;bayad Meralco&quot;, &quot;paalala bayad kuryente bukas 5pm&quot;
      </p>
    </div>
  )
}