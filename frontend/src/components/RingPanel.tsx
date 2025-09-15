import type { RingItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface RingPanelProps {
  rings: RingItem[]
}

export function RingPanel({ rings }: RingPanelProps) {
  return (
    <AccessoryPanel
      items={rings}
      title="Anneaux"
      subtitle="Repérez les anneaux et leurs enchantements uniques"
      searchPlaceholder="Rechercher un anneau"
      emptyLabel="Aucun anneau ne correspond à la recherche."
    />
  )
}
