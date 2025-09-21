import { useMemo, useState } from 'react'
import type { EquipmentCollections, PartyMember, Spell } from '../types'
import { computePartyMetrics, type PartyMetrics } from '../utils/party'
import { Panel } from './Panel'

interface PartyOverviewPanelProps {
  members: PartyMember[]
  spells: Spell[]
  equipment: EquipmentCollections
  skillsCatalog: string[]
  roleOptions: string[]
  actOptions: string[]
  metrics: PartyMetrics
}

type AlertSeverity = 'info' | 'warning' | 'danger'

interface AlertEntry {
  id: string
  label: string
  severity: AlertSeverity
}

const EXPORT_TEMPLATE = {
  generatedAt: '2025-01-01T12:00:00.000Z',
  filters: {
    act: '<string | null>',
    role: '<string | null>',
  },
  metrics: {
    totalMembers: 0,
    averageLevel: 0,
    classDistribution: [{ name: 'Classe', count: 0 }],
    roleDistribution: [{ name: 'Rôle', count: 0 }],
    skillsCovered: ['Compétence'],
    missingSkills: ['Compétence'],
    damageTypes: {
      spells: ['Type'],
      equipment: ['Type'],
      combined: ['Type'],
    },
    alerts: {
      missingSkills: ['Compétence'],
      duplicateClasses: ['Classe'],
      duplicateRoles: ['Rôle'],
      missingRoles: ['Rôle'],
    },
  },
} as const

export function PartyOverviewPanel({
  members,
  spells,
  equipment,
  skillsCatalog,
  roleOptions,
  actOptions,
  metrics,
}: PartyOverviewPanelProps) {
  const [selectedAct, setSelectedAct] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  const availableActs = useMemo(() => {
    const present = new Set<string>()
    for (const member of members) {
      if (member.act) {
        present.add(member.act)
      }
    }
    const filtered = actOptions.filter((option) => present.has(option))
    return filtered.length ? filtered : actOptions
  }, [actOptions, members])

  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        if (selectedAct && member.act !== selectedAct) {
          return false
        }
        if (selectedRole && member.role !== selectedRole) {
          return false
        }
        return true
      }),
    [members, selectedAct, selectedRole],
  )

  const filteredMetrics = useMemo(() => {
    if (!selectedAct && !selectedRole) {
      return metrics
    }
    return computePartyMetrics({
      members: filteredMembers,
      spells,
      equipment,
      skillsCatalog,
      roleCatalog: roleOptions,
    })
  }, [equipment, filteredMembers, metrics, roleOptions, selectedAct, selectedRole, skillsCatalog, spells])

  const alertEntries: AlertEntry[] = useMemo(() => {
    if (!filteredMetrics.totalMembers) {
      return [
        {
          id: 'no-members',
          label: 'Aucun compagnon ne correspond aux filtres sélectionnés.',
          severity: 'warning',
        },
      ]
    }

    const entries: AlertEntry[] = []

    if (filteredMetrics.alerts.missingSkills.length) {
      entries.push({
        id: 'missing-skills',
        label: `Compétences à couvrir : ${filteredMetrics.alerts.missingSkills.join(', ')}`,
        severity: 'danger',
      })
    }

    if (filteredMetrics.alerts.duplicateClasses.length) {
      entries.push({
        id: 'duplicate-classes',
        label: `Classes en doublon : ${filteredMetrics.alerts.duplicateClasses.join(', ')}`,
        severity: 'warning',
      })
    }

    if (filteredMetrics.alerts.duplicateRoles.length) {
      entries.push({
        id: 'duplicate-roles',
        label: `Rôles en doublon : ${filteredMetrics.alerts.duplicateRoles.join(', ')}`,
        severity: 'warning',
      })
    }

    if (filteredMetrics.alerts.missingRoles.length) {
      entries.push({
        id: 'missing-roles',
        label: `Rôles non représentés : ${filteredMetrics.alerts.missingRoles.join(', ')}`,
        severity: 'info',
      })
    }

    return entries
  }, [filteredMetrics])

  const exportTemplateJSON = useMemo(() => JSON.stringify(EXPORT_TEMPLATE, null, 2), [])

  const hasFilters = Boolean(selectedAct || selectedRole)

  function resetFilters() {
    setSelectedAct('')
    setSelectedRole('')
  }

  return (
    <Panel
      title="Synthèse de l'équipe"
      subtitle="Visualisez les recoupements et les angles morts de votre groupe"
      collapsible
      defaultCollapsed={false}
    >
      <div className="party-overview">
        <div className="party-overview__filters">
          <label>
            Acte
            <select value={selectedAct} onChange={(event) => setSelectedAct(event.target.value)}>
              <option value="">Tous</option>
              {availableActs.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rôle
            <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
              <option value="">Tous</option>
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {hasFilters ? (
            <button type="button" className="link" onClick={resetFilters}>
              Réinitialiser
            </button>
          ) : null}
        </div>

        <div className="party-overview__stats-grid">
          <article className="party-overview__stat-card">
            <span>Effectif analysé</span>
            <strong>{filteredMetrics.totalMembers}</strong>
          </article>
          <article className="party-overview__stat-card">
            <span>Niveau moyen</span>
            <strong>{filteredMetrics.totalMembers ? filteredMetrics.averageLevel.toFixed(2) : '—'}</strong>
          </article>
          <article className="party-overview__stat-card">
            <span>Types de dégâts maîtrisés</span>
            <strong>{filteredMetrics.damageTypes.combined.length}</strong>
          </article>
        </div>

        <div className="party-overview__distribution-grid">
          <section>
            <h4>Répartition par classe</h4>
            <ul className="party-overview__pill-list">
              {filteredMetrics.classDistribution.map((entry) => {
                const isAlert = filteredMetrics.alerts.duplicateClasses.includes(entry.name)
                return (
                  <li
                    key={`class-${entry.name}`}
                    className={`party-overview__pill${isAlert ? ' party-overview__pill--alert' : ''}`}
                  >
                    <span>{entry.name}</span>
                    <span className="party-overview__pill-count">{entry.count}</span>
                  </li>
                )
              })}
              {!filteredMetrics.classDistribution.length ? (
                <li className="empty">Aucune classe renseignée.</li>
              ) : null}
            </ul>
          </section>

          <section>
            <h4>Répartition par rôle</h4>
            <ul className="party-overview__pill-list">
              {filteredMetrics.roleDistribution.map((entry) => {
                const isAlert = filteredMetrics.alerts.duplicateRoles.includes(entry.name)
                return (
                  <li
                    key={`role-${entry.name}`}
                    className={`party-overview__pill${isAlert ? ' party-overview__pill--alert' : ''}`}
                  >
                    <span>{entry.name}</span>
                    <span className="party-overview__pill-count">{entry.count}</span>
                  </li>
                )
              })}
              {!filteredMetrics.roleDistribution.length ? (
                <li className="empty">Aucun rôle défini.</li>
              ) : null}
            </ul>
          </section>
        </div>

        <section>
          <h4>Couverture des compétences</h4>
          <ul className="party-overview__skill-list">
            {skillsCatalog.map((skill) => {
              const isCovered = filteredMetrics.skillsCovered.includes(skill)
              return (
                <li
                  key={skill}
                  className={`party-overview__skill${isCovered ? ' party-overview__skill--covered' : ' party-overview__skill--missing'}`}
                >
                  {skill}
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h4>Typologies de dégâts connues</h4>
          <div className="party-overview__damage-grid">
            <div>
              <h5>Sorts</h5>
              <ul className="party-overview__badge-list">
                {filteredMetrics.damageTypes.spells.map((type) => (
                  <li key={`spell-damage-${type}`} className="party-overview__badge">
                    {type}
                  </li>
                ))}
                {!filteredMetrics.damageTypes.spells.length ? <li className="empty">Aucun sort offensif recensé.</li> : null}
              </ul>
            </div>
            <div>
              <h5>Équipement</h5>
              <ul className="party-overview__badge-list">
                {filteredMetrics.damageTypes.equipment.map((type) => (
                  <li key={`equipment-damage-${type}`} className="party-overview__badge">
                    {type}
                  </li>
                ))}
                {!filteredMetrics.damageTypes.equipment.length ? (
                  <li className="empty">Aucune arme assignée avec dégâts identifiés.</li>
                ) : null}
              </ul>
            </div>
            <div>
              <h5>Couverture combinée</h5>
              <ul className="party-overview__badge-list party-overview__badge-list--highlight">
                {filteredMetrics.damageTypes.combined.map((type) => (
                  <li key={`combined-damage-${type}`} className="party-overview__badge party-overview__badge--highlight">
                    {type}
                  </li>
                ))}
                {!filteredMetrics.damageTypes.combined.length ? (
                  <li className="empty">Aucun type de dégâts détecté.</li>
                ) : null}
              </ul>
            </div>
          </div>
        </section>

        <section className="party-overview__alerts">
          <h4>Alertes prioritaires</h4>
          <ul className="party-overview__alert-list">
            {alertEntries.map((alert) => (
              <li key={alert.id} className={`party-overview__alert party-overview__alert--${alert.severity}`}>
                <span className="party-overview__alert-indicator" aria-hidden="true" />
                {alert.label}
              </li>
            ))}
            {!alertEntries.length ? <li className="empty">Aucune alerte à signaler.</li> : null}
          </ul>
        </section>

        <section className="party-overview__export">
          <h4>Format de synthèse exportable</h4>
          <p>
            Ce format JSON décrit les données à fournir pour un partage ou un export automatisé de cette synthèse. Les champs
            <code>filters</code> précisent le contexte (acte, rôle) et <code>metrics</code> encapsule les indicateurs agrégés et les
            alertes déduites.
          </p>
          <pre>{exportTemplateJSON}</pre>
        </section>
      </div>
    </Panel>
  )
}
