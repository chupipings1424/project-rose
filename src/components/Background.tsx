import { Suspense, lazy, useEffect } from 'react'
import { useNow } from '../hooks/useNow'
import { phaseOf } from '../theme/animated/phase'
import { themeGroupOf } from '../theme/themes'
import { useTheme } from '../theme/useTheme'

// Code-split: the animated layers (and their CSS) download only when an Animated theme is picked.
const AnimatedScene = lazy(() => import('../theme/animated/AnimatedScene'))

/** Keeps <html data-phase> (dawn / day / sunset / night) in step with the clock for the Day / Night theme. */
function DayPhaseSync() {
  const now = useNow(60_000)
  const phase = phaseOf(now.getHours())
  useEffect(() => {
    document.documentElement.dataset.phase = phase
  }, [phase])
  return null
}

/**
 * The backdrop behind every page. The orbs, grid and scanlines are pure CSS and never move
 * (see .bg-* in global.css); only the Animated themes add a moving layer on top of them.
 */
export function Background() {
  const { theme } = useTheme()

  return (
    <div className="bg-scene" aria-hidden="true">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-grid" />
      <div className="bg-scanlines" />
      {themeGroupOf(theme) === 'animated' && (
        <Suspense fallback={null}>
          <AnimatedScene theme={theme} />
        </Suspense>
      )}
      {theme === 'daynight' && <DayPhaseSync />}
    </div>
  )
}