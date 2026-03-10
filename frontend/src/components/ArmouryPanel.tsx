import type { ArmourItem } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl } from '../utils/icons'
import { renderArmourTooltip } from './equipmentCardContent'
import { useNameTypeRarityFilters } from './useNameTypeRarityFilters'

interface ArmouryPanelProps {
  armours: ArmourItem[]
}

export function ArmouryPanel({ armours }: ArmouryPanelProps) {
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    rarityFilter,
    setRarityFilter,
    filtered,
    uniqueTypes,
    uniqueRarities,
  } = useNameTypeRarityFilters(armours)

  return (
    <Panel title="Armurerie" subtitle="Comparez rapidement les armures disponibles" collapsible>
      <div className="filters">
        <input
          type="search"
          placeholder="Rechercher une armure"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="">Type</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type ?? ''}>
              {type}
            </option>
          ))}
        </select>
        <select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)}>
          <option value="">Rarete</option>
          {uniqueRarities.map((rarity) => (
            <option key={rarity} value={rarity ?? ''}>
              {rarity}
            </option>
          ))}
        </select>
      </div>
      <div className="icon-grid armour-grid">
        {filtered.map((item) => (
          <IconCard
            key={item.item_id}
            name={item.name}
            iconUrl={getIconUrl('armour', item.name, item.image_path)}
          >
            {renderArmourTooltip(item)}
          </IconCard>
        ))}
        {!filtered.length ? <p className="empty">Aucune armure ne correspond a la recherche.</p> : null}
      </div>
    </Panel>
  )
}
