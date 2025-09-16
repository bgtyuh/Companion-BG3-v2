import { useMemo, useState } from 'react'
import type { Spell } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl } from '../utils/icons'
import { getNormalizedSpellLevel, getSpellLevelLabel, sortSpellsByLevel } from '../utils/spells'

interface SpellLibraryProps {
  spells: Spell[]
}

export function SpellLibrary({ spells }: SpellLibraryProps) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')

  const levelOptions = useMemo(() => {
    const labelMap = new Map<string, string>()
    spells.forEach((spell) => {
      const value = getNormalizedSpellLevel(spell.level)
      if (!value) return
      if (!labelMap.has(value)) {
        labelMap.set(value, getSpellLevelLabel(spell.level) ?? `Niveau ${value}`)
      }
    })
    return Array.from(labelMap.entries())
      .sort((a, b) => {
        const aNum = Number.parseInt(a[0], 10)
        const bNum = Number.parseInt(b[0], 10)
        if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
          return a[1].localeCompare(b[1], 'fr')
        }
        return aNum - bNum
      })
      .map(([value, label]) => ({ value, label }))
  }, [spells])

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase()
    return spells
      .filter((spell) => (level ? getNormalizedSpellLevel(spell.level) === level : true))
      .filter((spell) => (lower ? spell.name.toLowerCase().includes(lower) : true))
      .sort(sortSpellsByLevel)
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
          {levelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="icon-grid spell-library">
        {filtered.map((spell) => {
          const levelLabel = getSpellLevelLabel(spell.level)
          const levelTitle = levelLabel === 'Cantrips' ? 'Type :' : 'Niveau :'
          return (
            <IconCard key={spell.name} name={spell.name} iconUrl={getIconUrl('spell', spell.name)}>
              <div className="icon-grid__tooltip-meta">
                {levelLabel ? (
                  <span>
                    <strong>{levelTitle}</strong> {levelLabel}
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
          )
        })}
        {!filtered.length ? <p className="empty">Aucun sort ne correspond à la recherche actuelle.</p> : null}
      </div>
    </Panel>
  )
}
