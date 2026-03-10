import type { ReactNode } from 'react'
import type { AccessoryItemBase } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl, type IconCategory } from '../utils/icons'
import { renderAccessoryTooltip } from './equipmentCardContent'
import { useNameTypeRarityFilters } from './useNameTypeRarityFilters'

interface AccessoryPanelProps<T extends AccessoryItemBase> {
  items: T[]
  title: string
  subtitle: string
  searchPlaceholder: string
  emptyLabel: string
  typeLabel?: string
  iconCategory: IconCategory
  renderDetails?: (item: T) => ReactNode
  defaultCollapsed?: boolean
}

export function AccessoryPanel<T extends AccessoryItemBase>({
  items,
  title,
  subtitle,
  searchPlaceholder,
  emptyLabel,
  typeLabel = 'Type',
  iconCategory,
  renderDetails,
  defaultCollapsed = true,
}: AccessoryPanelProps<T>) {
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
  } = useNameTypeRarityFilters(items)

  return (
    <Panel title={title} subtitle={subtitle} collapsible defaultCollapsed={defaultCollapsed}>
      <div className="filters">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
          <option value="">{typeLabel}</option>
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
      <div className="icon-grid accessory-grid">
        {filtered.map((item) => {
          const extraDetail = renderDetails ? renderDetails(item) : null
          const extraDetails = extraDetail ? [extraDetail] : []

          return (
            <IconCard
              key={item.item_id}
              name={item.name}
              iconUrl={getIconUrl(iconCategory, item.name, item.image_path)}
            >
              {renderAccessoryTooltip(item, extraDetails)}
            </IconCard>
          )
        })}
        {!filtered.length ? <p className="empty">{emptyLabel}</p> : null}
      </div>
    </Panel>
  )
}
