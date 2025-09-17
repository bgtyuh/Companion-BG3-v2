import { useMemo, useState } from 'react'
import type {
  Build,
  BuildLevel,
  CharacterClass,
  ClassProgressionEntry,
  Race,
  SubclassFeature,
} from '../types'
import { Panel } from './Panel'

interface BuildLibraryProps {
  builds: Build[]
  races: Race[]
  classes: CharacterClass[]
  onCreate: (build: Omit<Build, 'id'>) => Promise<void>
  onUpdate: (id: number, build: Omit<Build, 'id'>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

const abilityLevels = Array.from({ length: 12 }, (_, index) => index + 1)

const emptyLevel: BuildLevel = {
  level: 1,
  spells: '',
  feats: '',
  subclass_choice: '',
  multiclass_choice: '',
  note: '',
}

function splitFeatureList(raw?: string | null): string[] {
  if (!raw) {
    return []
  }
  return raw
    .split(/[,•/\n;]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== '-')
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function extractSelectedOptions(source: string | null | undefined, options: string[]): string[] {
  if (!source) {
    return []
  }
  const normalizedOptions = new Map(options.map((option) => [normalize(option), option]))
  return source
    .split(/[,•/\n;]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => normalizedOptions.get(normalize(entry)) ?? null)
    .filter((entry): entry is string => entry != null)
}

const progressionFieldLabels: Array<{
  key: keyof ClassProgressionEntry
  label: string
  formatter?: (value: NonNullable<ClassProgressionEntry[keyof ClassProgressionEntry]>) => string
}> = [
  { key: 'proficiency_bonus', label: 'Bonus de maîtrise' },
  { key: 'rage_charges', label: 'Charges de rage' },
  { key: 'rage_damage', label: 'Bonus de dégâts (Rage)' },
  { key: 'cantrips_known', label: 'Tours de magie connus' },
  { key: 'spells_known', label: 'Sorts connus' },
  { key: 'spell_slots_1st', label: 'Emplacements de sorts (niv. 1)' },
  { key: 'spell_slots_2nd', label: 'Emplacements de sorts (niv. 2)' },
  { key: 'spell_slots_3rd', label: 'Emplacements de sorts (niv. 3)' },
  { key: 'spell_slots_4th', label: 'Emplacements de sorts (niv. 4)' },
  { key: 'spell_slots_5th', label: 'Emplacements de sorts (niv. 5)' },
  { key: 'spell_slots_6th', label: 'Emplacements de sorts (niv. 6)' },
  { key: 'sorcery_points', label: 'Points de sorcellerie' },
  { key: 'sneak_attack_damage', label: 'Attaque sournoise' },
  { key: 'bardic_inspiration_charges', label: 'Charges Inspiration bardique' },
  { key: 'channel_divinity_charges', label: 'Charges Canalisation divine' },
  { key: 'lay_on_hands_charges', label: 'Réserves d’imposition des mains' },
  { key: 'ki_points', label: 'Points de ki' },
  { key: 'unarmoured_movement_bonus', label: 'Bonus de déplacement (sans armure)' },
  { key: 'martial_arts_damage', label: 'Dégâts d’arts martiaux' },
  { key: 'spell_slots_per_level', label: 'Emplacements par niveau' },
  { key: 'invocations_known', label: 'Invocations connues' },
]

function getProgressionHighlights(entry?: ClassProgressionEntry): Array<{ label: string; value: string }> {
  if (!entry) return []
  return progressionFieldLabels
    .map(({ key, label, formatter }) => {
      const value = entry[key]
      if (value == null) {
        return null
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || value <= 0) {
          return null
        }
        return { label, value: `${value}` }
      }
      const trimmed = `${value}`.trim()
      if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'none') {
        return null
      }
      return { label, value: formatter ? formatter(value) : trimmed }
    })
    .filter((entry): entry is { label: string; value: string } => entry != null)
}

function renderFeatureDescription(feature: SubclassFeature) {
  const description = feature.feature_description?.trim()
  return description ? description : null
}

export function BuildLibrary({ builds, races, classes, onCreate, onUpdate, onDelete }: BuildLibraryProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [form, setForm] = useState<Omit<Build, 'id'>>({
    name: '',
    race: '',
    class_name: '',
    subclass: '',
    notes: '',
    levels: [{ ...emptyLevel }],
  })
  function resetForm(hideForm = false) {
    setForm({ name: '', race: '', class_name: '', subclass: '', notes: '', levels: [{ ...emptyLevel }] })
    setIsEditing(false)
    setSelectedId(null)
    if (hideForm) {
      setIsFormVisible(false)
    }
  }

  const raceOptions = useMemo(
    () =>
      races.map((race) => ({
        name: race.name,
        subraces: (race.subraces ?? []).map((subrace) => subrace.name),
      })),
    [races],
  )

  const knownRaceValues = useMemo(() => {
    const values = new Set<string>()
    for (const race of raceOptions) {
      values.add(race.name)
      for (const subrace of race.subraces) {
        values.add(subrace)
      }
    }
    return values
  }, [raceOptions])

  const classOptions = useMemo(() => classes.map((klass) => klass.name), [classes])

  const selectedClass = useMemo(
    () => classes.find((klass) => klass.name === form.class_name) ?? null,
    [classes, form.class_name],
  )

  const subclassOptions = useMemo(() => {
    if (!selectedClass) return []
    return selectedClass.subclasses.map((entry) => entry.name)
  }, [selectedClass])

  const selectedSubclass = useMemo(
    () => selectedClass?.subclasses.find((entry) => entry.name === form.subclass) ?? null,
    [selectedClass, form.subclass],
  )

  const classHighlights = useMemo(() => {
    if (!selectedClass) return []
    const entries: Array<{ label: string; value: string | null | undefined }> = [
      { label: 'Points de vie (niveau 1)', value: selectedClass.hit_points_at_level1 },
      { label: 'Points de vie par niveau', value: selectedClass.hit_points_on_level_up },
      { label: 'Caractéristiques clés', value: selectedClass.key_abilities },
      { label: 'Jets de sauvegarde', value: selectedClass.saving_throw_proficiencies },
      { label: 'Maîtrises d’équipement', value: selectedClass.equipment_proficiencies },
      { label: 'Compétences', value: selectedClass.skill_proficiencies },
      { label: "Caractéristique d'incantation", value: selectedClass.spellcasting_ability },
      { label: 'Équipement de départ', value: selectedClass.starting_equipment },
    ]
    return entries
      .map(({ label, value }) => {
        const content = value?.trim()
        if (!content) {
          return null
        }
        return { label, value: content }
      })
      .filter((entry): entry is { label: string; value: string } => entry != null)
  }, [selectedClass])

  const subclassFeaturesByLevel = useMemo(() => {
    if (!selectedSubclass) return new Map<number, SubclassFeature[]>()
    const grouped = new Map<number, SubclassFeature[]>()
    for (const feature of selectedSubclass.features) {
      if (!grouped.has(feature.level)) {
        grouped.set(feature.level, [])
      }
      grouped.get(feature.level)?.push(feature)
    }
    return grouped
  }, [selectedSubclass])

  async function handleSubmit() {
    const payload: Omit<Build, 'id'> = {
      ...form,
      levels: [...form.levels]
        .filter((entry) => entry.level)
        .map((entry) => ({
          level: entry.level,
          spells: entry.spells?.trim() ?? '',
          feats: entry.feats?.trim() ?? '',
          subclass_choice: entry.subclass_choice?.trim() ?? '',
          multiclass_choice: entry.multiclass_choice?.trim() ?? '',
          note: entry.note?.trim() ?? '',
        }))
        .sort((a, b) => a.level - b.level),
    }

    if (isEditing && selectedId) {
      await onUpdate(selectedId, payload)
    } else {
      await onCreate(payload)
    }
    resetForm(true)
  }

  function handleEdit(build: Build) {
    setForm({
      name: build.name,
      race: build.race ?? '',
      class_name: build.class_name ?? '',
      subclass: build.subclass ?? '',
      notes: build.notes ?? '',
      levels: build.levels.length
        ? build.levels.map((level) => ({ ...level, note: level.note ?? '' }))
        : [{ ...emptyLevel }],
    })
    setSelectedId(build.id)
    setIsEditing(true)
    setIsFormVisible(true)
  }

  function updateLevel(index: number, updates: Partial<BuildLevel>) {
    setForm((state) => {
      const nextLevels = state.levels.map((level, i) => (i === index ? { ...level, ...updates } : level))
      return { ...state, levels: nextLevels }
    })
  }

  function addLevel() {
    setForm((state) => ({ ...state, levels: [...state.levels, { ...emptyLevel, level: Math.min(12, state.levels.length + 1) }] }))
  }

  function removeLevel(index: number) {
    setForm((state) => ({
      ...state,
      levels: state.levels.filter((_, i) => i !== index),
    }))
  }

  function handleCreateClick() {
    if (isFormVisible && !isEditing) {
      resetForm(true)
      return
    }
    resetForm()
    setIsFormVisible(true)
  }

  return (
    <Panel title="Concepteur de builds" subtitle="Documentez vos plans de progression niveau par niveau">
      <div className="build-library">
        <div className="build-library__list">
          <ul>
            {builds.map((build) => (
              <li key={build.id} className={isEditing && build.id === selectedId ? 'active' : ''}>
                <span>{build.name}</span>
                <div className="build-library__actions">
                  <button className="link" onClick={() => handleEdit(build)}>
                    Modifier
                  </button>
                  <button
                    className="link link--danger"
                    onClick={() => {
                      void onDelete(build.id)
                      if (isEditing && selectedId === build.id) {
                        resetForm(true)
                      }
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
            {!builds.length ? <p className="empty">Enregistrez vos premiers builds pour les proposer à l'équipe.</p> : null}
          </ul>
          <button type="button" onClick={handleCreateClick} className="build-library__new">
            + Nouveau build
          </button>
        </div>
        <div className="build-library__details">
          {isFormVisible ? (
            <form
              className="build-form"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSubmit()
              }}
            >
              <div className="build-form__header">
                <h3>{isEditing ? 'Modifier le build' : 'Créer un build'}</h3>
                <button
                  type="button"
                  className="build-form__close"
                  onClick={() => resetForm(true)}
                  aria-label="Fermer le formulaire de build"
                >
                  ×
                </button>
              </div>
              <div className="form__row">
                <label>
                  Nom du build
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
                  />
                </label>
                <label>
                  Race conseillée
                  <select
                    value={form.race ?? ''}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        race: event.target.value,
                      }))
                    }
                  >
                    <option value="">—</option>
                    {raceOptions.map((race) => (
                      <optgroup key={race.name} label={race.name}>
                        <option value={race.name}>{race.name}</option>
                        {race.subraces.map((subrace) => (
                          <option key={`${race.name}-${subrace}`} value={subrace}>
                            {subrace}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    {form.race && !knownRaceValues.has(form.race) ? (
                      <option value={form.race}>{form.race}</option>
                    ) : null}
                  </select>
                </label>
                <label>
                  Classe
                  <select
                    value={form.class_name ?? ''}
                    onChange={(event) => {
                      const nextClass = event.target.value
                      setForm((state) => ({
                        ...state,
                        class_name: nextClass,
                        subclass: '',
                      }))
                    }}
                  >
                    <option value="">—</option>
                    {classOptions.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                    {form.class_name && !classOptions.includes(form.class_name) ? (
                      <option value={form.class_name}>{form.class_name}</option>
                    ) : null}
                  </select>
                </label>
                <label>
                  Sous-classe
                  <select
                    value={form.subclass ?? ''}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        subclass: event.target.value,
                      }))
                    }
                    disabled={!form.class_name}
                  >
                    <option value="">—</option>
                    {subclassOptions.map((subclass) => (
                      <option key={subclass} value={subclass}>
                        {subclass}
                      </option>
                    ))}
                    {form.subclass && !subclassOptions.includes(form.subclass) ? (
                      <option value={form.subclass}>{form.subclass}</option>
                    ) : null}
                  </select>
                </label>
              </div>
              {selectedClass ? (
                <section className="build-form__class-overview">
                  <header className="build-form__class-overview-header">
                    <div>
                      <h4>{selectedClass.name}</h4>
                      {selectedClass.description ? (
                        <p className="build-form__class-description">{selectedClass.description}</p>
                      ) : null}
                    </div>
                  </header>
                  {classHighlights.length ? (
                    <dl className="build-form__class-details">
                      {classHighlights.map((entry) => (
                        <div key={entry.label}>
                          <dt>{entry.label}</dt>
                          <dd>{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </section>
              ) : null}
              {selectedSubclass ? (
                <section className="build-form__subclass-overview">
                  <h5>{selectedSubclass.name}</h5>
                  {selectedSubclass.description ? (
                    <p className="build-form__class-description">{selectedSubclass.description}</p>
                  ) : null}
                </section>
              ) : null}
              <label>
                Notes générales
                <textarea
                  rows={3}
                  value={form.notes ?? ''}
                  onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))}
                />
              </label>
              <div className="build-form__levels">
                <div className="build-form__levels-header">
                  <h4>Progression par niveau</h4>
                  <button type="button" className="link" onClick={addLevel}>
                    Ajouter un niveau
                  </button>
                </div>
                {form.levels.map((level, index) => {
                  const classProgression = selectedClass?.progression.find((entry) => entry.level === level.level)
                  const classFeatureOptions = splitFeatureList(classProgression?.features)
                  const selectedClassFeatures = extractSelectedOptions(level.spells ?? '', classFeatureOptions)
                  const progressionHighlights = getProgressionHighlights(classProgression)
                  const subclassFeatures = subclassFeaturesByLevel.get(level.level) ?? []
                  const subclassFeatureOptions = subclassFeatures.map((feature) => feature.feature_name)
                  const selectedSubclassFeatures = extractSelectedOptions(level.subclass_choice ?? '', subclassFeatureOptions)

                  return (
                    <div key={`${level.level}-${index}`} className="build-form__level">
                      <div className="build-form__level-header">
                        <label className="build-form__level-select">
                          Niveau
                          <select
                            value={level.level}
                            onChange={(event) =>
                              updateLevel(index, { level: Number.parseInt(event.target.value, 10) })
                            }
                          >
                            {abilityLevels.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                        {progressionHighlights.length ? (
                          <dl className="build-form__level-stats">
                            {progressionHighlights.map((entry) => (
                              <div key={entry.label}>
                                <dt>{entry.label}</dt>
                                <dd>{entry.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : selectedClass ? (
                          <p className="build-form__hint build-form__hint--muted">
                            Aucun changement majeur pour ce niveau.
                          </p>
                        ) : (
                          <p className="build-form__hint build-form__hint--muted">
                            Choisissez une classe pour afficher sa progression détaillée.
                          </p>
                        )}
                      </div>

                      {classFeatureOptions.length ? (
                        <div className="build-form__level-section">
                          <label>
                            Capacités de classe disponibles
                            <select
                              multiple
                              value={selectedClassFeatures}
                              onChange={(event) => {
                                const values = Array.from(event.target.selectedOptions, (option) => option.value)
                                updateLevel(index, { spells: values.join('\n') })
                              }}
                            >
                              {classFeatureOptions.map((feature) => (
                                <option key={feature} value={feature}>
                                  {feature}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p className="build-form__hint">
                            Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs capacités à mettre en avant.
                          </p>
                        </div>
                      ) : (
                        <p className="build-form__hint build-form__hint--muted">
                          Ce niveau n’accorde pas de nouvelle capacité de classe.
                        </p>
                      )}

                      <label className="build-form__level-summary">
                        Résumé de vos choix de classe
                        <textarea
                          rows={2}
                          value={level.spells ?? ''}
                          onChange={(event) => updateLevel(index, { spells: event.target.value })}
                          placeholder="Décrivez les capacités ou combinaisons que vous souhaitez retenir pour ce niveau."
                        />
                      </label>

                      {subclassFeatures.length ? (
                        <div className="build-form__level-section">
                          <label>
                            Capacités de sous-classe
                            <select
                              multiple
                              value={selectedSubclassFeatures}
                              onChange={(event) => {
                                const values = Array.from(event.target.selectedOptions, (option) => option.value)
                                updateLevel(index, { subclass_choice: values.join('\n') })
                              }}
                            >
                              {subclassFeatureOptions.map((feature) => (
                                <option key={feature} value={feature}>
                                  {feature}
                                </option>
                              ))}
                            </select>
                          </label>
                          <ul className="build-form__feature-list">
                            {subclassFeatures.map((feature) => (
                              <li key={`${feature.feature_name}-${feature.level}`}>
                                <strong>{feature.feature_name}</strong>
                                {renderFeatureDescription(feature) ? (
                                  <p>{renderFeatureDescription(feature)}</p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="build-form__level-row">
                        <label>
                          Dons / améliorations
                          <input
                            type="text"
                            value={level.feats ?? ''}
                            onChange={(event) => updateLevel(index, { feats: event.target.value })}
                            placeholder="Sharpshooter, Capacité améliorée…"
                          />
                        </label>
                        <label>
                          Multi-classe
                          <select
                            value={level.multiclass_choice ?? ''}
                            onChange={(event) => updateLevel(index, { multiclass_choice: event.target.value })}
                          >
                            <option value="">—</option>
                            {classOptions.map((className) => (
                              <option key={className} value={className}>
                                {className}
                              </option>
                            ))}
                            {level.multiclass_choice &&
                            level.multiclass_choice !== '' &&
                            !classOptions.includes(level.multiclass_choice) ? (
                              <option value={level.multiclass_choice}>{level.multiclass_choice}</option>
                            ) : null}
                          </select>
                        </label>
                      </div>

                      <label>
                        Notes détaillées
                        <textarea
                          rows={3}
                          value={level.note ?? ''}
                          onChange={(event) => updateLevel(index, { note: event.target.value })}
                          placeholder="Ajoutez des précisions sur ce palier, des choix personnels ou des variantes."
                        />
                      </label>

                      <button type="button" className="link link--danger" onClick={() => removeLevel(index)}>
                        Retirer ce palier
                      </button>
                    </div>
                  )
                })}
              </div>
              <button type="submit">{isEditing ? 'Mettre à jour le build' : 'Enregistrer le build'}</button>
            </form>
          ) : (
            <p className="empty">Sélectionnez un build pour le modifier ou créez-en un nouveau.</p>
          )}
        </div>
      </div>
    </Panel>
  )
}
