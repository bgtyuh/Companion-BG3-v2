import type { WeaponItem } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl } from '../utils/icons'
import { renderWeaponTooltip } from './equipmentCardContent'
import { useNameTypeRarityFilters } from './useNameTypeRarityFilters'

interface WeaponPanelProps {
  weapons: WeaponItem[]
}

export function WeaponPanel({ weapons }: WeaponPanelProps) {
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
  } = useNameTypeRarityFilters(weapons)

  return (
    <Panel title="Arsenal" subtitle="Revisez les armes cles pour vos strategies" collapsible>
      <div className="filters">
        <input
          type="search"
          placeholder="Rechercher une arme"
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
      <div className="icon-grid weapon-grid">
        {filtered.map((item) => (
          <IconCard
            key={item.weapon_id}
            name={item.name}
            iconUrl={getIconUrl('weapon', item.name, item.image_path)}
          >
            {renderWeaponTooltip(item)}
          </IconCard>
        ))}
        {!filtered.length ? <p className="empty">Aucune arme ne correspond a la recherche.</p> : null}
      </div>
    </Panel>
  )
}
