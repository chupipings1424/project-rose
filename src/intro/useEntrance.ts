import { useContext } from 'react'
import { EntranceContext } from './entranceContext'

export function useEntrance() {
  const value = useContext(EntranceContext)
  if (!value) throw new Error('useEntrance must be used inside <EntranceProvider>')
  return value
}