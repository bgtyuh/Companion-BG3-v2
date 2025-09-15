import { useMemo, useState, type ReactNode } from 'react'
import type { AccessoryItemBase } from '../types'
import { Panel } from './Panel'

interface AccessoryPanelProps<T extends AccessoryItemBase> {
  items: T[]
  title: string
  subtitle: string
  searchPlaceholder: string
  emptyLabel: string
  typeLabel?: string
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
      <div className="accessory-grid">
        {filtered.map((item) => (
          <article key={item.item_id}>
            <header>
              <h4>{item.name}</h4>
              <p>{item.type}</p>
            </header>
            <p className="accessory-grid__rarity">{item.rarity}</p>
            {renderDetails ? renderDetails(item) : null}
            {item.locations.length ? (
              <p className="accessory-grid__location">{item.locations[0].description}</p>
            ) : null}
            {item.specials.length ? (
              <ul className="accessory-grid__specials">
                {item.specials.slice(0, 2).map((special) => (
                  <li key={special.name}>
                    <strong>{special.name} :</strong> {special.effect}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        {!filtered.length ? <p className="empty">{emptyLabel}</p> : null}
      </div>
    </Panel>
  )
}
