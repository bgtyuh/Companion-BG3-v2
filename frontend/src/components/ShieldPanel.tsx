import type { ShieldItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface ShieldPanelProps {
  shields: ShieldItem[]
  defaultCollapsed?: boolean
}

export function ShieldPanel({ shields, defaultCollapsed = true }: ShieldPanelProps) {
  return (
    <AccessoryPanel
      items={shields}
      title="Boucliers"
      subtitle="Identifiez les boucliers qui compléteront vos défenses"
      searchPlaceholder="Rechercher un bouclier"
      emptyLabel="Aucun bouclier ne correspond à la recherche."
      iconCategory="shield"
      renderDetails={(item) =>
        item.shield_class_base != null ? (
          <>
            <strong>Classe de bouclier :</strong> {item.shield_class_base}
          </>
        ) : null
      }
      defaultCollapsed={defaultCollapsed}
    />
  )
}
