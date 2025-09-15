import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useLocalStorage } from '../hooks'
import type {
  AbilityScoreKey,
  Build,
  CharacterClass,
  PartyMember,
  Race,
  Spell,
} from '../types'
import { downloadJSON, readJSONFile } from '../utils/file'
import { CharacterSheet } from './CharacterSheet'
import { Panel } from './Panel'

interface PartyPlannerProps {
  builds: Build[]
  races: Race[]
  classes: CharacterClass[]
  spells: Spell[]
  weaponOptions: string[]
  armourOptions: string[]
}

const abilityKeys: AbilityScoreKey[] = [
  'Strength',
  'Dexterity',
  'Constitution',
  'Intelligence',
  'Wisdom',
  'Charisma',
]

const skillOptions = [
  'Acrobaties',
  'Arcanes',
  'Athlétisme',
  'Discrétion',
  'Dressage',
  'Escamotage',
  'Histoire',
  'Intimidation',
  'Investigation',
  'Médecine',
  'Nature',
  'Perception',
  'Perspicacité',
  'Persuasion',
  'Religion',
  'Représentation',
  'Survie',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isAbilityScoreKey(value: string): value is AbilityScoreKey {
  return abilityKeys.includes(value as AbilityScoreKey)
}

function isValidAbilityScores(value: unknown): value is Record<AbilityScoreKey, number> {
  if (!isRecord(value)) return false
  return abilityKeys.every((key) => {
    const score = value[key]
    return typeof score === 'number' && Number.isFinite(score)
  })
}

function isValidPartyMember(value: unknown): value is PartyMember {
  if (!isRecord(value)) return false

  if (typeof value.id !== 'string') return false
  if (typeof value.name !== 'string') return false
  if (typeof value.level !== 'number' || !Number.isFinite(value.level) || !Number.isInteger(value.level)) return false
  if (!isValidAbilityScores(value.abilityScores)) return false

  if (!isStringArray(value.savingThrows)) return false
  if (!value.savingThrows.every((item) => isAbilityScoreKey(item))) return false

  if (!isStringArray(value.skills)) return false
  if (!isStringArray(value.equippedWeapons)) return false
  if (!isStringArray(value.spells)) return false

  if (value.race !== undefined && typeof value.race !== 'string') return false
  if (value.subrace !== undefined && typeof value.subrace !== 'string') return false
  if (value.class_name !== undefined && typeof value.class_name !== 'string') return false
  if (value.subclass !== undefined && typeof value.subclass !== 'string') return false
  if (value.background !== undefined && typeof value.background !== 'string') return false
  if (value.equippedArmour !== undefined && typeof value.equippedArmour !== 'string') return false
  if (value.notes !== undefined && typeof value.notes !== 'string') return false

  if (value.buildId !== undefined && typeof value.buildId !== 'number') return false

  return true
}

function sanitizeMember(member: PartyMember): PartyMember {
  return {
    id: member.id,
    name: member.name,
    race: member.race ?? undefined,
    subrace: member.subrace ?? undefined,
    class_name: member.class_name ?? undefined,
    subclass: member.subclass ?? undefined,
    background: member.background ?? undefined,
    level: member.level,
    buildId: member.buildId ?? undefined,
    abilityScores: abilityKeys.reduce<PartyMember['abilityScores']>((scores, key) => {
      scores[key] = member.abilityScores[key]
      return scores
    }, {} as PartyMember['abilityScores']),
    savingThrows: member.savingThrows.filter((savingThrow): savingThrow is AbilityScoreKey =>
      abilityKeys.includes(savingThrow),
    ),
    skills: [...member.skills],
    equippedWeapons: [...member.equippedWeapons],
    equippedArmour: member.equippedArmour ?? undefined,
    spells: [...member.spells],
    notes: member.notes ?? undefined,
  }
}

function parseImportedMembers(data: unknown): PartyMember[] | null {
  if (!Array.isArray(data)) return null
  if (!data.every((item) => isValidPartyMember(item))) return null

  return data.map((member) => sanitizeMember(member))
}

function createEmptyMember(): PartyMember {
  return {
    id: crypto.randomUUID(),
    name: '',
    level: 1,
    abilityScores: abilityKeys.reduce<PartyMember['abilityScores']>((acc, key) => {
      acc[key] = 10
      return acc
    }, {} as PartyMember['abilityScores']),
    savingThrows: [],
    skills: [],
    equippedWeapons: [],
    spells: [],
    notes: '',
  }
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function PartyPlanner({ builds, races, classes, spells, weaponOptions, armourOptions }: PartyPlannerProps) {
  const [members, setMembers] = useLocalStorage<PartyMember[]>('bg3-companion-party', [])
  const [selectedId, setSelectedId] = useState<string | null>(members[0]?.id ?? null)
  const [editingMember, setEditingMember] = useState<PartyMember | null>(null)
  const [spellQuery, setSpellQuery] = useState('')
  const [weaponInput, setWeaponInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedId) ?? null,
    [members, selectedId],
  )

  const selectedBuild = useMemo(
    () => builds.find((build) => build.id === selectedMember?.buildId),
    [builds, selectedMember?.buildId],
  )

  const selectedRaceInfo = useMemo(
    () => races.find((race) => race.name === selectedMember?.race),
    [races, selectedMember?.race],
  )

  const selectedClassInfo = useMemo(
    () => classes.find((klass) => klass.name === selectedMember?.class_name),
    [classes, selectedMember?.class_name],
  )

  const filteredSpells = useMemo(() => {
    if (!spellQuery.trim()) return spells.slice(0, 8)
    const lower = spellQuery.toLowerCase()
    return spells.filter((spell) => spell.name.toLowerCase().includes(lower)).slice(0, 8)
  }, [spells, spellQuery])

  useEffect(() => {
    if (!members.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !members.some((member) => member.id === selectedId)) {
      setSelectedId(members[0].id)
    }
  }, [members, selectedId])

  function startCreate() {
    const member = createEmptyMember()
    setEditingMember(member)
    setSelectedId(member.id)
    setSpellQuery('')
    setWeaponInput('')
  }

  function startEdit(member: PartyMember) {
    setEditingMember({ ...member, abilityScores: { ...member.abilityScores }, spells: [...member.spells], skills: [...member.skills], savingThrows: [...member.savingThrows], equippedWeapons: [...member.equippedWeapons] })
    setSelectedId(member.id)
    setSpellQuery('')
    setWeaponInput('')
  }

  function cancelEdit() {
    setEditingMember(null)
    setSpellQuery('')
    setWeaponInput('')
  }

  function saveMember(member: PartyMember) {
    setMembers((current) => {
      const exists = current.some((item) => item.id === member.id)
      if (exists) {
        return current.map((item) => (item.id === member.id ? member : item))
      }
      return [...current, member]
    })
    setEditingMember(null)
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
  }

  function addWeaponToForm() {
    if (!editingMember || !weaponInput.trim()) return
    const value = weaponInput.trim()
    if (!editingMember.equippedWeapons.includes(value)) {
      setEditingMember({ ...editingMember, equippedWeapons: [...editingMember.equippedWeapons, value] })
    }
    setWeaponInput('')
  }

  function removeWeaponFromForm(value: string) {
    if (!editingMember) return
    setEditingMember({
      ...editingMember,
      equippedWeapons: editingMember.equippedWeapons.filter((weapon) => weapon !== value),
    })
  }

  function addSpellToForm(name: string) {
    if (!editingMember) return
    if (!editingMember.spells.includes(name)) {
      setEditingMember({ ...editingMember, spells: [...editingMember.spells, name] })
    }
  }

  function removeSpell(name: string) {
    if (!editingMember) return
    setEditingMember({ ...editingMember, spells: editingMember.spells.filter((spell) => spell !== name) })
  }

  function handleExport() {
    downloadJSON(members, 'bg3-party-members.json')
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    try {
      const data = await readJSONFile<unknown>(file)
      const parsedMembers = parseImportedMembers(data)

      if (!parsedMembers) {
        window.alert('Le fichier ne correspond pas au format attendu.')
        return
      }

      setMembers(parsedMembers)
      setSelectedId(parsedMembers[0]?.id ?? null)
      setEditingMember(null)
      setSpellQuery('')
      setWeaponInput('')
    } catch (error) {
      console.error('Failed to import party members', error)
      window.alert("Impossible d'importer les membres. Vérifiez le fichier.")
    } finally {
      input.value = ''
    }
  }

  function triggerImport() {
    fileInputRef.current?.click()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingMember) return
    if (!editingMember.name.trim()) {
      return
    }
    saveMember({
      ...editingMember,
      name: editingMember.name.trim(),
      background: editingMember.background?.trim(),
      equippedArmour: editingMember.equippedArmour?.trim(),
    })
  }

  return (
    <div className="party-planner">
      <Panel
        title="Gestion de l'équipe"
        subtitle="Personnalisez vos compagnons et assignez-leur des builds"
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              hidden
            />
            <button type="button" className="link" onClick={handleExport}>
              Exporter
            </button>
            <button type="button" className="link" onClick={triggerImport}>
              Importer
            </button>
            <button type="button" className="link" onClick={startCreate}>
              Ajouter un membre
            </button>
          </>
        }
      >
        <div className="party-planner__layout">
          <div className="party-planner__roster">
            <ul>
              {members.map((member) => (
                <li key={member.id} className={member.id === selectedId ? 'active' : ''}>
                  <button className="link" onClick={() => setSelectedId(member.id)}>
                    <span className="party-planner__name">{member.name || 'Compagnon sans nom'}</span>
                    <span className="party-planner__meta">
                      {member.class_name ? `${member.class_name} · ` : ''}Niv. {member.level}
                    </span>
                  </button>
                  <div className="party-planner__roster-actions">
                    <button className="link" onClick={() => startEdit(member)}>
                      Modifier
                    </button>
                    <button className="link link--danger" onClick={() => removeMember(member.id)}>
                      Retirer
                    </button>
                  </div>
                </li>
              ))}
              {!members.length ? <p className="empty">Commencez par ajouter vos compagnons à l'équipe.</p> : null}
            </ul>
          </div>

          <div className="party-planner__editor">
            {editingMember ? (
              <form className="party-form" onSubmit={handleSubmit}>
                <div className="form__row">
                  <label>
                    Nom
                    <input
                      type="text"
                      value={editingMember.name}
                      onChange={(event) => setEditingMember({ ...editingMember, name: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Niveau
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={editingMember.level}
                      onChange={(event) =>
                        setEditingMember({ ...editingMember, level: Number.parseInt(event.target.value, 10) })
                      }
                    />
                  </label>
                  <label>
                    Build conseillé
                    <select
                      value={editingMember.buildId ?? ''}
                      onChange={(event) =>
                        setEditingMember({
                          ...editingMember,
                          buildId: event.target.value ? Number.parseInt(event.target.value, 10) : undefined,
                        })
                      }
                    >
                      <option value="">—</option>
                      {builds.map((build) => (
                        <option key={build.id} value={build.id}>
                          {build.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form__row">
                  <label>
                    Race
                    <select
                      value={editingMember.race ?? ''}
                      onChange={(event) =>
                        setEditingMember({
                          ...editingMember,
                          race: event.target.value || undefined,
                          subrace: undefined,
                        })
                      }
                    >
                      <option value="">—</option>
                      {races.map((race) => (
                        <option key={race.name} value={race.name}>
                          {race.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sous-race
                    <select
                      value={editingMember.subrace ?? ''}
                      onChange={(event) =>
                        setEditingMember({ ...editingMember, subrace: event.target.value || undefined })
                      }
                    >
                      <option value="">—</option>
                      {races
                        .find((race) => race.name === editingMember.race)
                        ?.subraces.map((subrace) => (
                          <option key={subrace.name} value={subrace.name}>
                            {subrace.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Classe
                    <select
                      value={editingMember.class_name ?? ''}
                      onChange={(event) =>
                        setEditingMember({
                          ...editingMember,
                          class_name: event.target.value || undefined,
                          subclass: undefined,
                        })
                      }
                    >
                      <option value="">—</option>
                      {classes.map((klass) => (
                        <option key={klass.name} value={klass.name}>
                          {klass.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Spécialisation
                    <select
                      value={editingMember.subclass ?? ''}
                      onChange={(event) =>
                        setEditingMember({ ...editingMember, subclass: event.target.value || undefined })
                      }
                    >
                      <option value="">—</option>
                      {classes
                        .find((klass) => klass.name === editingMember.class_name)
                        ?.subclasses.map((subclass) => (
                          <option key={subclass.name} value={subclass.name}>
                            {subclass.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <label>
                  Historique
                  <input
                    type="text"
                    value={editingMember.background ?? ''}
                    onChange={(event) => setEditingMember({ ...editingMember, background: event.target.value })}
                  />
                </label>

                <div className="party-form__grid">
                  <div>
                    <h4>Caractéristiques</h4>
                    <div className="ability-editor">
                      {abilityKeys.map((key) => (
                        <label key={key}>
                          {key}
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={editingMember.abilityScores[key]}
                            onChange={(event) =>
                              setEditingMember({
                                ...editingMember,
                                abilityScores: {
                                  ...editingMember.abilityScores,
                                  [key]: Number.parseInt(event.target.value, 10),
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4>Jets de sauvegarde</h4>
                    <div className="toggle-grid">
                      {abilityKeys.map((key) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={editingMember.savingThrows.includes(key)}
                            onChange={() =>
                              setEditingMember({
                                ...editingMember,
                                savingThrows: toggleValue(editingMember.savingThrows, key),
                              })
                            }
                          />
                          {key}
                        </label>
                      ))}
                    </div>

                    <h4>Compétences</h4>
                    <div className="toggle-grid">
                      {skillOptions.map((skill) => (
                        <label key={skill}>
                          <input
                            type="checkbox"
                            checked={editingMember.skills.includes(skill)}
                            onChange={() =>
                              setEditingMember({
                                ...editingMember,
                                skills: toggleValue(editingMember.skills, skill),
                              })
                            }
                          />
                          {skill}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form__row">
                  <label>
                    Armure équipée
                    <input
                      list="armour-options"
                      value={editingMember.equippedArmour ?? ''}
                      onChange={(event) =>
                        setEditingMember({ ...editingMember, equippedArmour: event.target.value || undefined })
                      }
                      placeholder="Sélectionnez ou saisissez"
                    />
                    <datalist id="armour-options">
                      {armourOptions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </label>
                  <label className="weapon-input">
                    Armes équipées
                    <div className="weapon-input__row">
                      <input
                        list="weapon-options"
                        value={weaponInput}
                        onChange={(event) => setWeaponInput(event.target.value)}
                        placeholder="Épée, arc, etc."
                      />
                      <button type="button" className="link" onClick={addWeaponToForm}>
                        Ajouter
                      </button>
                    </div>
                    <datalist id="weapon-options">
                      {weaponOptions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                    <ul className="tag-list">
                      {editingMember.equippedWeapons.map((weapon) => (
                        <li key={weapon}>
                          {weapon}
                          <button type="button" onClick={() => removeWeaponFromForm(weapon)}>
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </label>
                </div>

                <div className="spell-selector">
                  <div className="spell-selector__header">
                    <h4>Sorts connus</h4>
                    <input
                      type="search"
                      value={spellQuery}
                      onChange={(event) => setSpellQuery(event.target.value)}
                      placeholder="Rechercher un sort"
                    />
                  </div>
                  <div className="spell-selector__content">
                    <ul className="spell-selector__results">
                      {filteredSpells.map((spell) => (
                        <li key={spell.name}>
                          <button type="button" onClick={() => addSpellToForm(spell.name)}>
                            {spell.name}
                          </button>
                          {spell.level ? <span>Niv. {spell.level}</span> : null}
                        </li>
                      ))}
                    </ul>
                    <ul className="tag-list">
                      {editingMember.spells.map((spell) => (
                        <li key={spell}>
                          {spell}
                          <button type="button" onClick={() => removeSpell(spell)}>
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={editingMember.notes ?? ''}
                    onChange={(event) => setEditingMember({ ...editingMember, notes: event.target.value })}
                  />
                </label>

                <div className="form__actions">
                  <button type="submit">Enregistrer</button>
                  <button type="button" className="link" onClick={cancelEdit}>
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <p className="empty">Sélectionnez un compagnon puis cliquez sur « Modifier » pour ajuster ses données.</p>
            )}
          </div>
        </div>
      </Panel>

      <CharacterSheet
        member={selectedMember}
        build={selectedBuild}
        raceInfo={selectedRaceInfo}
        classInfo={selectedClassInfo}
        spells={spells}
      />
    </div>
  )
}
