import { useMemo, useState } from 'react'
import type { Ability } from '../types'
import { Panel } from './Panel'
import { IconCard } from './IconCard'
import { getIconUrl } from '../utils/icons'

interface AbilityReferenceProps {
  abilities: Ability[]
}

const abilityUseLabels: Record<string, string> = {
  attack_damage_rolls: "Jets d'attaque & de dégâts",
  jump_distance: 'Distance de saut',
  carrying_capacity: 'Capacité de charge',
  throws: 'Jets de lancer',
  armour_class: "Classe d'armure",
  initiative: 'Initiative',
  hit_points: 'Points de vie',
}

const abilityCheckLabels: Record<string, string> = {
  general: 'Tests',
}

function formatLabel(value: string) {
  return value
    .split(/[_\-\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatUseName(name: string) {
  return abilityUseLabels[name] ?? formatLabel(name)
}

function formatCheckType(type: string) {
  return abilityCheckLabels[type] ?? formatLabel(type)
}

export function AbilityReference({ abilities }: AbilityReferenceProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase()
    return abilities
      .filter((ability) => {
        if (!lower) return true
        if (ability.name.toLowerCase().includes(lower)) {
          return true
        }
        if (ability.description?.toLowerCase().includes(lower)) {
          return true
        }
        if (
          ability.uses.some(
            (use) =>
              use.name.toLowerCase().includes(lower) ||
              (use.description?.toLowerCase().includes(lower) ?? false),
          )
        ) {
          return true
        }
        if (
          ability.skills.some(
            (skill) =>
              skill.name.toLowerCase().includes(lower) ||
              (skill.description?.toLowerCase().includes(lower) ?? false),
          )
        ) {
          return true
        }
        return ability.saves.some(
          (save) => save.description?.toLowerCase().includes(lower) ?? false,
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [abilities, search])

  return (
    <Panel
      title="Traits de caractéristiques"
      subtitle="Retrouvez l'impact de chaque caractéristique sur vos jets"
      collapsible
    >
      <div className="filters">
        <input
          type="search"
          placeholder="Rechercher une caractéristique"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="icon-grid ability-library">
        {filtered.map((ability) => (
          <IconCard
            key={ability.name}
            name={ability.name}
            iconUrl={getIconUrl('ability', ability.name, ability.image_path)}
          >
            {ability.description ? (
              <p className="icon-grid__tooltip-description">{ability.description}</p>
            ) : null}
            {ability.uses.length ? (
              <div className="icon-grid__tooltip-section">
                <strong>Usages clés</strong>
                <ul className="icon-grid__tooltip-list">
                  {ability.uses.map((use) => (
                    <li key={use.name}>
                      <span className="icon-grid__tooltip-list-title">{formatUseName(use.name)}</span>
                      {use.description ? <span>{use.description}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ability.checks.length ? (
              <div className="icon-grid__tooltip-section">
                <strong>Tests</strong>
                <ul className="icon-grid__tooltip-list">
                  {ability.checks.map((check) => (
                    <li key={check.type}>
                      <span className="icon-grid__tooltip-list-title">{formatCheckType(check.type)}</span>
                      {check.description ? <span>{check.description}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ability.skills.length ? (
              <div className="icon-grid__tooltip-section">
                <strong>Compétences liées</strong>
                <ul className="icon-grid__tooltip-list">
                  {ability.skills.map((skill) => (
                    <li key={skill.name}>
                      <span className="icon-grid__tooltip-list-title">{skill.name}</span>
                      {skill.description ? <span>{skill.description}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ability.saves.length ? (
              <div className="icon-grid__tooltip-section">
                <strong>Jets de sauvegarde</strong>
                <ul className="ability-library__saves">
                  {ability.saves.map((save, index) => (
                    <li key={`${ability.name}-save-${index}`}>
                      {save.description ?? '—'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </IconCard>
        ))}
        {!filtered.length ? (
          <p className="empty">Aucune caractéristique ne correspond à votre recherche.</p>
        ) : null}
      </div>
    </Panel>
  )
}
