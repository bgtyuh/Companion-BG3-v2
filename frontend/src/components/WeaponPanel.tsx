import { useMemo, useState } from 'react'
import type { WeaponItem } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl } from '../utils/icons'

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
      <div className="icon-grid weapon-grid">
        {filtered.map((item) => {
          const damages = item.damages.slice(0, 3)
          const actions = item.actions.slice(0, 2)
          const abilities = item.abilities.slice(0, 2)
          const location = item.locations[0]?.description

          return (
            <IconCard
              key={item.weapon_id}
              name={item.name}
              iconUrl={getIconUrl('weapon', item.name, item.image_path)}
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
                {item.enchantment ? (
                  <span>
                    <strong>Enchantement :</strong> +{item.enchantment}
                  </span>
                ) : null}
                {item.attributes ? (
                  <span>
                    <strong>Attributs :</strong> {item.attributes}
                  </span>
                ) : null}
              </div>
              {item.description ? (
                <p className="icon-grid__tooltip-description">{item.description}</p>
              ) : null}
              {damages.length ? (
                <div className="icon-grid__tooltip-section">
                  <strong>Dégâts</strong>
                  <ul className="icon-grid__tooltip-list">
                    {damages.map((damage, index) => (
                      <li key={`${item.weapon_id}-damage-${index}`}>
                        <span className="icon-grid__tooltip-list-title">
                          {damage.damage_type ?? '—'}
                        </span>
                        <span>
                          {damage.damage_dice ?? '—'} {damage.modifier ? `(${damage.modifier})` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {actions.length ? (
                <div className="icon-grid__tooltip-section">
                  <strong>Actions</strong>
                  <ul className="icon-grid__tooltip-list">
                    {actions.map((action) => (
                      <li key={action.name}>
                        <span className="icon-grid__tooltip-list-title">{action.name}</span>
                        {action.description ? <span>{action.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {abilities.length ? (
                <div className="icon-grid__tooltip-section">
                  <strong>Propriétés</strong>
                  <ul className="icon-grid__tooltip-list">
                    {abilities.map((ability) => (
                      <li key={ability.name}>
                        <span className="icon-grid__tooltip-list-title">{ability.name}</span>
                        {ability.description ? <span>{ability.description}</span> : null}
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
        {!filtered.length ? <p className="empty">Aucune arme ne correspond à la recherche.</p> : null}
      </div>
    </Panel>
  )
}
