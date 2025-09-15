import type { FootwearItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface FootwearPanelProps {
  footwears: FootwearItem[]
}

export function FootwearPanel({ footwears }: FootwearPanelProps) {
  return (
    <AccessoryPanel
      items={footwears}
      title="Bottes & chaussures"
      subtitle="Sélectionnez la bonne foulée pour vos héros"
      searchPlaceholder="Rechercher une paire"
      emptyLabel="Aucune paire ne correspond à la recherche."
      renderDetails={(item) =>
        item.required_proficiency ? (
          <p className="accessory-grid__details">Maîtrise requise : {item.required_proficiency}</p>
        ) : null
      }
    />
  )
}
