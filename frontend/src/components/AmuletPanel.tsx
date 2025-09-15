import type { AmuletItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface AmuletPanelProps {
  amulets: AmuletItem[]
}

export function AmuletPanel({ amulets }: AmuletPanelProps) {
  return (
    <AccessoryPanel
      items={amulets}
      title="Amulettes"
      subtitle="Choisissez les talismans qui protégeront votre groupe"
      searchPlaceholder="Rechercher une amulette"
      emptyLabel="Aucune amulette ne correspond à la recherche."
    />
  )
}
