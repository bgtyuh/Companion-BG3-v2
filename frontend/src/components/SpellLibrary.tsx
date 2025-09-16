import { useMemo, useState } from 'react'
import type { Spell } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl } from '../utils/icons'

interface SpellLibraryProps {
  spells: Spell[]
}

const levels = ['0', '1', '2', '3', '4', '5', '6']

export function SpellLibrary({ spells }: SpellLibraryProps) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')

  const filtered = useMemo(() => {
    const lower = search.toLowerCase()
    return spells
      .filter((spell) => (level ? spell.level === level : true))
      .filter((spell) => (lower ? spell.name.toLowerCase().includes(lower) : true))
      .slice(0, 30)
  }, [spells, search, level])

  return (
    <Panel title="Grimoire" subtitle="Consultez rapidement vos options arcaniques" collapsible>
      <div className="filters">
        <input
          type="search"
          placeholder="Chercher un sort"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="">Tous les niveaux</option>
          {levels.map((lvl) => (
            <option key={lvl} value={lvl}>
              Niveau {lvl}
            </option>
          ))}
        </select>
      </div>
      <div className="icon-grid spell-library">
        {filtered.map((spell) => (
          <IconCard key={spell.name} name={spell.name} iconUrl={getIconUrl('spell', spell.name)}>
            <div className="icon-grid__tooltip-meta">
              {spell.level ? (
                <span>
                  <strong>Niveau :</strong> {spell.level}
                </span>
              ) : null}
            </div>
            {spell.description ? (
              <p className="icon-grid__tooltip-description">{spell.description}</p>
            ) : null}
            {spell.properties.length ? (
              <div className="icon-grid__tooltip-section">
                <strong>Propriétés</strong>
                <ul className="icon-grid__tooltip-list">
                  {spell.properties.slice(0, 4).map((property) => (
                    <li key={property.name}>
                      <span className="icon-grid__tooltip-list-title">{property.name}</span>
                      <span>{property.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </IconCard>
        ))}
        {!filtered.length ? <p className="empty">Aucun sort ne correspond à la recherche actuelle.</p> : null}
      </div>
    </Panel>
  )
}
