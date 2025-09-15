import { useMemo, useState } from 'react'
import type { ArmourItem } from '../types'
import { Panel } from './Panel'

interface ArmouryPanelProps {
  armours: ArmourItem[]
}

export function ArmouryPanel({ armours }: ArmouryPanelProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return armours
      .filter((item) => (typeFilter ? item.type === typeFilter : true))
      .filter((item) => (rarityFilter ? item.rarity === rarityFilter : true))
      .filter((item) => (lower ? item.name.toLowerCase().includes(lower) : true))
      .slice(0, 40)
  }, [armours, search, typeFilter, rarityFilter])

  const uniqueTypes = useMemo(() => Array.from(new Set(armours.map((item) => item.type).filter(Boolean))), [armours])
  const uniqueRarities = useMemo(
    () => Array.from(new Set(armours.map((item) => item.rarity).filter(Boolean))),
    [armours],
  )

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
          <option value="">Rareté</option>
          {uniqueRarities.map((rarity) => (
            <option key={rarity} value={rarity ?? ''}>
              {rarity}
            </option>
          ))}
        </select>
      </div>
      <div className="armour-grid">
        {filtered.map((item) => (
          <article key={item.item_id}>
            <header>
              <h4>{item.name}</h4>
              <p>{item.type}</p>
            </header>
            <p className="armour-grid__rarity">{item.rarity}</p>
            <p className="armour-grid__stats">
              CA de base : {item.armour_class_base ?? '—'}{' '}
              {item.armour_class_modifier ? `(${item.armour_class_modifier})` : ''}
            </p>
            {item.locations.length ? (
              <p className="armour-grid__location">{item.locations[0].description}</p>
            ) : null}
            {item.specials.length ? (
              <ul className="armour-grid__specials">
                {item.specials.slice(0, 2).map((special) => (
                  <li key={special.name}>
                    <strong>{special.name} :</strong> {special.effect}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        {!filtered.length ? <p className="empty">Aucune armure ne correspond à la recherche.</p> : null}
      </div>
    </Panel>
  )
}
