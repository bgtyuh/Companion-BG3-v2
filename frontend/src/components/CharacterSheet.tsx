import type { AbilityScoreKey, Build, CharacterClass, PartyMember, Race, Spell } from '../types'
import { equipmentSlotLabels, equipmentSlotOrder } from '../utils/equipment'
import { Panel } from './Panel'

interface CharacterSheetProps {
  member: PartyMember | null
  build: Build | undefined
  raceInfo: Race | undefined
  classInfo: CharacterClass | undefined
  spells: Spell[]
}

const abilityOrder: { key: AbilityScoreKey; label: string }[] = [
  { key: 'Strength', label: 'Force' },
  { key: 'Dexterity', label: 'Dextérité' },
  { key: 'Constitution', label: 'Constitution' },
  { key: 'Intelligence', label: 'Intelligence' },
  { key: 'Wisdom', label: 'Sagesse' },
  { key: 'Charisma', label: 'Charisme' },
]

function abilityModifier(score: number | undefined) {
  if (score === undefined) return 0
  return Math.floor((score - 10) / 2)
}

export function CharacterSheet({ member, build, raceInfo, classInfo, spells }: CharacterSheetProps) {
  if (!member) {
    return (
      <Panel title="Fiche de personnage" subtitle="Sélectionnez un héros pour consulter ses détails">
        <p className="empty">Choisissez un compagnon dans la colonne de gauche pour afficher sa fiche.</p>
      </Panel>
    )
  }

  const knownSpells = spells.filter((spell) => member.spells.includes(spell.name))
  const equipment = member.equipment ?? {}
  const nextLevel = Math.min(12, member.level + 1)
  const nextStep = build?.levels.find((level) => level.level === nextLevel)

  return (
    <Panel
      title={`Fiche de ${member.name}`}
      subtitle="Vue d'ensemble du personnage et de son plan de progression"
      className="character-sheet"
    >
      <section className="character-sheet__identity">
        <div>
          <h3>{member.name}</h3>
          <ul>
            <li>
              <strong>Niveau :</strong> {member.level}
            </li>
            {member.race ? (
              <li>
                <strong>Race :</strong> {member.race}
              </li>
            ) : null}
            {member.subrace ? (
              <li>
                <strong>Sous-race :</strong> {member.subrace}
              </li>
            ) : null}
            {member.class_name ? (
              <li>
                <strong>Classe :</strong> {member.class_name}
              </li>
            ) : null}
            {member.subclass ? (
              <li>
                <strong>Spécialisation :</strong> {member.subclass}
              </li>
            ) : null}
            {member.background ? (
              <li>
                <strong>Historique :</strong> {member.background}
              </li>
            ) : null}
            {raceInfo?.base_speed ? (
              <li>
                <strong>Vitesse :</strong> {raceInfo.base_speed}
              </li>
            ) : null}
          </ul>
        </div>
        <div className="character-sheet__build">
          <h4>Build assigné</h4>
          {build ? (
            <div>
              <p className="character-sheet__build-name">{build.name}</p>
              {build.notes ? <p className="character-sheet__notes">{build.notes}</p> : null}
              {nextStep ? (
                <div className="character-sheet__next-step">
                  <h5>Préparez le niveau {nextLevel}</h5>
                  <p>
                    <strong>Sorts :</strong> {nextStep.spells || '—'}
                  </p>
                  <p>
                    <strong>Dons :</strong> {nextStep.feats || '—'}
                  </p>
                  <p>
                    <strong>Choix spéciaux :</strong>{' '}
                    {nextStep.subclass_choice || nextStep.multiclass_choice || '—'}
                  </p>
                </div>
              ) : (
                <p className="character-sheet__notes">Ce build couvre jusqu'au niveau {build.levels.at(-1)?.level ?? ''}.</p>
              )}
            </div>
          ) : (
            <p className="empty">Aucun build sélectionné. Choisissez un plan pour guider la progression.</p>
          )}
        </div>
      </section>

      <section className="character-sheet__stats">
        <div>
          <h4>Caractéristiques</h4>
          <ul className="ability-grid">
            {abilityOrder.map(({ key, label }) => (
              <li key={key}>
                <span className="ability-grid__label">{label}</span>
                <span className="ability-grid__score">{member.abilityScores[key] ?? 10}</span>
                <span className="ability-grid__modifier">
                  {abilityModifier(member.abilityScores[key]) >= 0 ? '+' : ''}
                  {abilityModifier(member.abilityScores[key])}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Jets de sauvegarde</h4>
          <ul className="tag-list">
            {member.savingThrows.length ? (
              member.savingThrows.map((save) => <li key={save}>{save}</li>)
            ) : (
              <li className="empty">Aucun bonus renseigné</li>
            )}
          </ul>
          <h4>Compétences</h4>
          <ul className="tag-list">
            {member.skills.length ? member.skills.map((skill) => <li key={skill}>{skill}</li>) : <li className="empty">—</li>}
          </ul>
        </div>
      </section>

      <section className="character-sheet__equipment">
        <h4>Équipement</h4>
        <div className="equipment-layout equipment-layout--sheet">
          <div className="equipment-layout__character" aria-hidden="true">
            <span>{member.name}</span>
          </div>
          {equipmentSlotOrder.map((slot) => {
            const value = equipment[slot]
            return (
              <div key={slot} className={`equipment-slot equipment-slot--${slot} equipment-slot--read-only`}>
                <span className="equipment-slot__label">{equipmentSlotLabels[slot]}</span>
                <span className={value ? 'equipment-slot__value' : 'equipment-slot__value equipment-slot__value--empty'}>
                  {value ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="character-sheet__spellbook">
        <h4>Grimoire</h4>
        {knownSpells.length ? (
          <div className="spell-list">
            {knownSpells.map((spell) => (
              <article key={spell.name}>
                <header>
                  <span className="spell-list__name">{spell.name}</span>
                  {spell.level ? <span className="spell-list__level">Niv. {spell.level}</span> : null}
                </header>
                <p>{spell.description}</p>
                <ul>
                  {spell.properties.map((property) => (
                    <li key={property.name}>
                      <strong>{property.name} :</strong> {property.value}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty">Ajoutez des sorts via le formulaire de gestion de l'équipe.</p>
        )}
      </section>

      {member.notes ? (
        <section className="character-sheet__notes-block">
          <h4>Notes personnelles</h4>
          <p>{member.notes}</p>
        </section>
      ) : null}

      {classInfo ? (
        <section className="character-sheet__progression">
          <h4>Table de progression : {classInfo.name}</h4>
          <div className="progression-table">
            {classInfo.progression.map((entry) => (
              <div key={entry.level} className={entry.level === nextLevel ? 'progression-table__row progression-table__row--active' : 'progression-table__row'}>
                <div>
                  <strong>Niveau {entry.level}</strong>
                </div>
                <div>
                  <strong>Bonus de maîtrise :</strong> {entry.proficiency_bonus || '—'}
                </div>
                <div>
                  <strong>Traits :</strong> {entry.features || '—'}
                </div>
                {entry.spell_slots_1st ? (
                  <div>
                    <strong>Emplacements :</strong> {entry.spell_slots_per_level || '1er:' + entry.spell_slots_1st}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Panel>
  )
}
