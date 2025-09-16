import type { FootwearItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface FootwearPanelProps {
  footwears: FootwearItem[]
  defaultCollapsed?: boolean
}

export function FootwearPanel({ footwears, defaultCollapsed = true }: FootwearPanelProps) {
  return (
    <AccessoryPanel
      items={footwears}
      title="Bottes & chaussures"
      subtitle="Sélectionnez la bonne foulée pour vos héros"
      searchPlaceholder="Rechercher une paire"
      emptyLabel="Aucune paire ne correspond à la recherche."
      iconCategory="footwear"
      renderDetails={(item) =>
        item.required_proficiency ? (
          <>
            <strong>Maîtrise requise :</strong> {item.required_proficiency}
          </>
        ) : null
      }
      defaultCollapsed={defaultCollapsed}
    />
  )
}
