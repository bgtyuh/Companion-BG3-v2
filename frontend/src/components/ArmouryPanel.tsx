import { useMemo, useState } from 'react'
import type { ArmourItem } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl } from '../utils/icons'

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
      <div className="icon-grid armour-grid">
        {filtered.map((item) => {
          const specials = item.specials.slice(0, 3)
          const location = item.locations[0]?.description

          return (
            <IconCard
              key={item.item_id}
              name={item.name}
              iconUrl={getIconUrl('armour', item.name, item.image_path)}
            >
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
                <span>
                  <strong>Classe d'armure :</strong> {item.armour_class_base ?? '—'}
                  {item.armour_class_modifier ? ` (${item.armour_class_modifier})` : ''}
                </span>
                {item.weight_kg != null ? (
                  <span>
                    <strong>Poids :</strong> {item.weight_kg} kg
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
            </IconCard>
          )
        })}
        {!filtered.length ? <p className="empty">Aucune armure ne correspond à la recherche.</p> : null}
      </div>
    </Panel>
  )
}
