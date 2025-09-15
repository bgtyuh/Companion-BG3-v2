import { useMemo, useState } from 'react'
import type { Spell } from '../types'
import { Panel } from './Panel'

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
      <div className="spell-library">
        {filtered.map((spell) => (
          <article key={spell.name}>
            <header>
              <h4>{spell.name}</h4>
              {spell.level ? <span>Niv. {spell.level}</span> : null}
            </header>
            <p>{spell.description}</p>
            {spell.properties.length ? (
              <ul>
                {spell.properties.slice(0, 3).map((property) => (
                  <li key={property.name}>
                    <strong>{property.name} :</strong> {property.value}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        {!filtered.length ? <p className="empty">Aucun sort ne correspond à la recherche actuelle.</p> : null}
      </div>
    </Panel>
  )
}
