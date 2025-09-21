import { useMemo, useState } from 'react'
import type { Ability } from '../types'
import { Panel } from './Panel'
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
      {filtered.length ? (
        <div className="ability-library">
          {filtered.map((ability) => {
            const iconUrl = getIconUrl('ability', ability.name, ability.image_path)

            return (
              <article key={ability.name} className="ability-library__card">
                <header className="ability-library__header">
                  <div className="ability-library__icon" aria-hidden="true">
                    {iconUrl ? (
                      <img src={iconUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="ability-library__icon-placeholder">
                        {ability.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="ability-library__heading">
                    <h3 className="ability-library__title">{ability.name}</h3>
                    {ability.description ? (
                      <p className="ability-library__summary">{ability.description}</p>
                    ) : null}
                  </div>
                </header>
                <div className="ability-library__content">
                  {ability.uses.length ? (
                    <section className="ability-library__section">
                      <h4 className="ability-library__section-title">Usages clés</h4>
                      <ul className="ability-library__list">
                        {ability.uses.map((use) => (
                          <li key={use.name} className="ability-library__list-item">
                            <span className="ability-library__list-title">
                              {formatUseName(use.name)}
                            </span>
                            {use.description ? (
                              <span className="ability-library__list-text">{use.description}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {ability.checks.length ? (
                    <section className="ability-library__section">
                      <h4 className="ability-library__section-title">Tests</h4>
                      <ul className="ability-library__list">
                        {ability.checks.map((check) => (
                          <li key={check.type} className="ability-library__list-item">
                            <span className="ability-library__list-title">
                              {formatCheckType(check.type)}
                            </span>
                            {check.description ? (
                              <span className="ability-library__list-text">{check.description}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {ability.skills.length ? (
                    <section className="ability-library__section">
                      <h4 className="ability-library__section-title">Compétences liées</h4>
                      <ul className="ability-library__list">
                        {ability.skills.map((skill) => (
                          <li key={skill.name} className="ability-library__list-item">
                            <span className="ability-library__list-title">{skill.name}</span>
                            {skill.description ? (
                              <span className="ability-library__list-text">{skill.description}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {ability.saves.length ? (
                    <section className="ability-library__section">
                      <h4 className="ability-library__section-title">Jets de sauvegarde</h4>
                      <ul className="ability-library__list ability-library__list--saves">
                        {ability.saves.map((save, index) => (
                          <li key={`${ability.name}-save-${index}`} className="ability-library__list-item">
                            <span className="ability-library__list-text">
                              {save.description ?? '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="empty">Aucune caractéristique ne correspond à votre recherche.</p>
      )}
    </Panel>
  )
}
