import { useMemo, useState, type ReactNode } from 'react'
import type { AccessoryItemBase } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl, type IconCategory } from '../utils/icons'

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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return items
      .filter((item) => (typeFilter ? item.type === typeFilter : true))
      .filter((item) => (rarityFilter ? item.rarity === rarityFilter : true))
      .filter((item) => (lower ? item.name.toLowerCase().includes(lower) : true))
      .slice(0, 40)
  }, [items, search, typeFilter, rarityFilter])

  const uniqueTypes = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.type)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [items],
  )
  const uniqueRarities = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.rarity)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [items],
  )

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
          <option value="">Rareté</option>
          {uniqueRarities.map((rarity) => (
            <option key={rarity} value={rarity ?? ''}>
              {rarity}
            </option>
          ))}
        </select>
      </div>
      <div className="icon-grid accessory-grid">
        {filtered.map((item) => {
          const location = item.locations[0]?.description
          const specials = item.specials.slice(0, 3)
          const extraDetail = renderDetails ? renderDetails(item) : null

          return (
            <IconCard key={item.item_id} name={item.name} iconUrl={getIconUrl(iconCategory, item.name)}>
              <div className="icon-grid__tooltip-meta">
                {item.type ? (
                  <span>
                    <strong>Type :</strong> {item.type}
                  </span>
                ) : null}
                {item.rarity ? (
                  <span>
                    <strong>Rareté :</strong> {item.rarity}
                  </span>
                ) : null}
                {extraDetail ? <span>{extraDetail}</span> : null}
                {item.price_gp != null ? (
                  <span>
                    <strong>Prix :</strong> {item.price_gp} po
                  </span>
                ) : null}
              </div>
              {item.description ? (
                <p className="icon-grid__tooltip-description">{item.description}</p>
              ) : null}
              {specials.length ? (
                <div className="icon-grid__tooltip-section">
                  <strong>Effets</strong>
                  <ul className="icon-grid__tooltip-list">
                    {specials.map((special) => (
                      <li key={special.name}>
                        <span className="icon-grid__tooltip-list-title">{special.name}</span>
                        {special.effect ? <span>{special.effect}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {location ? (
                <div className="icon-grid__tooltip-section">
                  <strong>Obtention</strong>
                  <p>{location}</p>
                </div>
              ) : null}
              {item.quote ? (
                <p className="icon-grid__tooltip-quote">{item.quote}</p>
              ) : null}
            </IconCard>
          )
        })}
        {!filtered.length ? <p className="empty">{emptyLabel}</p> : null}
      </div>
    </Panel>
  )
}
