import type { ThemeId } from '../themes'
import { useTheme } from '../useTheme'
import { DayNightSky } from './DayNightSky'
import { IsometricShapes } from './IsometricShapes'
import { ParticleMesh } from './ParticleMesh'
import { RosePetals } from './RosePetals'
import './animated.css'

/**
 * The moving layer of an Animated theme. Background.tsx loads this file with React.lazy, so the
 * code and CSS are only downloaded by people who pick an Animated theme.
 */
export default function AnimatedScene({ theme }: { theme: ThemeId }) {
  const { motion } = useTheme()
  switch (theme) {
    case 'mesh':
      return <ParticleMesh motion={motion} />
    case 'daynight':
      return <DayNightSky />
    case 'isometric':
      return <IsometricShapes />
    case 'bloom':
      return <RosePetals />
    default:
      return null
  }
}