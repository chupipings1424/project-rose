// Which entrance each theme plays. Adding a theme = adding one scene here
// (TypeScript refuses to compile until every ThemeId has one).
import type { ComponentType } from 'react'
import type { ThemeId } from '../../theme/themes'
import { GateOfTruth, ZoldyckGate } from './DoorScene'
import { HologramScene } from './HologramScene'
import { KamehamehaScene } from './KamehamehaScene'
import { GeassScene } from './GeassScene'
import { MatrixScene } from './MatrixScene'
import { NeonScene } from './NeonScene'
import { NotebookScene } from './NotebookScene'
import { SenkaimonScene } from './SenkaimonScene'
import { SharinganScene } from './SharinganScene'
import { SolarScene } from './SolarScene'
import { SpaceScene } from './SpaceScene'
import type { SceneProps } from './types'
import './scenes.css'

export const SCENES: Readonly<Record<ThemeId, ComponentType<SceneProps>>> = {
  neon: NeonScene,
  space: SpaceScene,
  matrix: MatrixScene,
  solar: SolarScene,
  hologram: HologramScene,
  hunter: ZoldyckGate,
  alchemist: GateOfTruth,
  deathnote: NotebookScene,
  dragonball: KamehamehaScene,
  naruto: SharinganScene,
  bleach: SenkaimonScene,
  geass: GeassScene,
}