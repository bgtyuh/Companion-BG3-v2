import type { ClothingItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface ClothingPanelProps {
  clothing: ClothingItem[]
  defaultCollapsed?: boolean
}

export function ClothingPanel({ clothing, defaultCollapsed = true }: ClothingPanelProps) {
  return (
    <AccessoryPanel
      items={clothing}
      title="Tenues"
      subtitle="Assurez-vous que chaque aventurier dispose de la tenue adéquate"
      searchPlaceholder="Rechercher une tenue"
      emptyLabel="Aucune tenue ne correspond à la recherche."
      renderDetails={(item) =>
        item.armour_class_base != null || item.armour_class_modifier ? (
          <p className="accessory-grid__details">
            CA de base : {item.armour_class_base ?? '—'}{' '}
            {item.armour_class_modifier ? `(${item.armour_class_modifier})` : ''}
          </p>
        ) : null
      }
      defaultCollapsed={defaultCollapsed}
    />
  )
}
