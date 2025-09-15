import type { HeadwearItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface HeadwearPanelProps {
  headwears: HeadwearItem[]
}

export function HeadwearPanel({ headwears }: HeadwearPanelProps) {
  return (
    <AccessoryPanel
      items={headwears}
      title="Coiffes"
      subtitle="Choisissez les couvre-chefs adaptés à chaque situation"
      searchPlaceholder="Rechercher une coiffe"
      emptyLabel="Aucune coiffe ne correspond à la recherche."
    />
  )
}
