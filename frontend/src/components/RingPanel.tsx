import type { RingItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface RingPanelProps {
  rings: RingItem[]
  defaultCollapsed?: boolean
}

export function RingPanel({ rings, defaultCollapsed = true }: RingPanelProps) {
  return (
    <AccessoryPanel
      items={rings}
      title="Anneaux"
      subtitle="Repérez les anneaux et leurs enchantements uniques"
      searchPlaceholder="Rechercher un anneau"
      emptyLabel="Aucun anneau ne correspond à la recherche."
      defaultCollapsed={defaultCollapsed}
    />
  )
}
