import type { HeadwearItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface HeadwearPanelProps {
  headwears: HeadwearItem[]
  defaultCollapsed?: boolean
}

export function HeadwearPanel({ headwears, defaultCollapsed = true }: HeadwearPanelProps) {
  return (
    <AccessoryPanel
      items={headwears}
      title="Coiffes"
      subtitle="Choisissez les couvre-chefs adaptés à chaque situation"
      searchPlaceholder="Rechercher une coiffe"
      emptyLabel="Aucune coiffe ne correspond à la recherche."
      defaultCollapsed={defaultCollapsed}
    />
  )
}
