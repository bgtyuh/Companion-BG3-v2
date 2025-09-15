import { useMemo, useState } from 'react'
import type { WeaponItem } from '../types'
import { Panel } from './Panel'

interface WeaponPanelProps {
  weapons: WeaponItem[]
}

export function WeaponPanel({ weapons }: WeaponPanelProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return weapons
      .filter((item) => (typeFilter ? item.type === typeFilter : true))
      .filter((item) => (rarityFilter ? item.rarity === rarityFilter : true))
      .filter((item) => (lower ? item.name.toLowerCase().includes(lower) : true))
      .slice(0, 40)
  }, [weapons, search, typeFilter, rarityFilter])

  const uniqueTypes = useMemo(() => Array.from(new Set(weapons.map((item) => item.type).filter(Boolean))), [weapons])
  const uniqueRarities = useMemo(
    () => Array.from(new Set(weapons.map((item) => item.rarity).filter(Boolean))),
    [weapons],
  )

  return (
    <Panel title="Arsenal" subtitle="Révisez les armes clés pour vos stratégies" collapsible>
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
          <option value="">Rareté</option>
          {uniqueRarities.map((rarity) => (
            <option key={rarity} value={rarity ?? ''}>
              {rarity}
            </option>
          ))}
        </select>
      </div>
      <div className="weapon-grid">
        {filtered.map((item) => (
          <article key={item.weapon_id}>
            <header>
              <h4>{item.name}</h4>
              <p>{item.type}</p>
            </header>
            <p className="weapon-grid__rarity">{item.rarity}</p>
            {item.damages.length ? (
              <ul className="weapon-grid__damage">
                {item.damages.slice(0, 2).map((damage, index) => (
                  <li key={`${item.weapon_id}-damage-${index}`}>
                    {damage.damage_dice} {damage.damage_type} {damage.modifier ? `(${damage.modifier})` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
            {item.actions.length ? (
              <ul className="weapon-grid__actions">
                {item.actions.slice(0, 1).map((action) => (
                  <li key={action.name}>
                    <strong>{action.name} :</strong> {action.description}
                  </li>
                ))}
              </ul>
            ) : null}
            {item.locations.length ? <p className="weapon-grid__location">{item.locations[0].description}</p> : null}
          </article>
        ))}
        {!filtered.length ? <p className="empty">Aucune arme ne correspond à la recherche.</p> : null}
      </div>
    </Panel>
  )
}
