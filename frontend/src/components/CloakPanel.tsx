import type { CloakItem } from '../types'
import { AccessoryPanel } from './AccessoryPanel'

interface CloakPanelProps {
  cloaks: CloakItem[]
  defaultCollapsed?: boolean
}

export function CloakPanel({ cloaks, defaultCollapsed = true }: CloakPanelProps) {
  return (
    <AccessoryPanel
      items={cloaks}
      title="Capes"
      subtitle="Trouvez la cape idéale pour vos subterfuges ou vos duels"
      searchPlaceholder="Rechercher une cape"
      emptyLabel="Aucune cape ne correspond à la recherche."
      iconCategory="cloak"
      defaultCollapsed={defaultCollapsed}
    />
  )
}
