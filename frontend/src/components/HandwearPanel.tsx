import type { HandwearItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface HandwearPanelProps {
  handwears: HandwearItem[]
  defaultCollapsed?: boolean
}

export function HandwearPanel({ handwears, defaultCollapsed = true }: HandwearPanelProps) {
  return (
    <AccessoryPanel
      items={handwears}
      title="Gants"
      subtitle="Comparez les gants pour optimiser vos actions et compétences"
      searchPlaceholder="Rechercher des gants"
      emptyLabel="Aucun gant ne correspond à la recherche."
      defaultCollapsed={defaultCollapsed}
    />
  )
}
