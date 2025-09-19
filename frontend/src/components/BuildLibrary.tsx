import { useMemo, useState } from 'react'
import type { Build, BuildLevel, CharacterClass, Race, SubclassFeature } from '../types'
import { getProgressionHighlights } from '../utils/progression'
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

function splitFeatureList(raw?: string | null): string[] {
  if (!raw) {
    return []
  }
  return raw
    .split(/[,•/\n;]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== '-')
}

function createEmptyLevel(level = 1): BuildLevel {
  return {
    level,
    spells: '',
    feats: '',
    subclass_choice: '',
    multiclass_choice: '',
    note: '',
  }
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
    levels: [createEmptyLevel()],
  })
  function resetForm(hideForm = false) {
    setForm({ name: '', race: '', class_name: '', subclass: '', notes: '', levels: [createEmptyLevel()] })
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
        ? build.levels.map((level) => ({
            id: level.id,
            level: level.level,
            spells: level.spells ?? '',
            feats: level.feats ?? '',
            subclass_choice: level.subclass_choice ?? '',
            multiclass_choice: level.multiclass_choice ?? '',
            note: level.note ?? '',
          }))
        : [createEmptyLevel()],
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
    setForm((state) => ({
      ...state,
      levels: [...state.levels, createEmptyLevel(Math.min(12, state.levels.length + 1))],
    }))
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
                  const progressionHighlights = getProgressionHighlights(classProgression)
                  const subclassFeatures = subclassFeaturesByLevel.get(level.level) ?? []
                  const shouldSuggestFeat = classFeatureOptions.some((feature) => /feat|improvement/i.test(feature))
                  const shouldSuggestSubclassChoice = classFeatureOptions.some((feature) => /subclass/i.test(feature))
                  const shouldSuggestChoices =
                    classFeatureOptions.some((feature) =>
                      /choose|pick|select|spell|cantrip|invocation|metamagic|prepared|fighting style|infusion|maneuver|expertise/i.test(
                        feature,
                      ),
                    ) || Boolean(classProgression?.cantrips_known || classProgression?.spells_known)
                  const displayChoiceField = shouldSuggestChoices || Boolean(level.spells)
                  const displayFeatField = shouldSuggestFeat || Boolean(level.feats)
                  const displaySubclassChoice = shouldSuggestSubclassChoice || Boolean(level.subclass_choice)

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
                          <h5>Ce que le jeu accorde à ce niveau</h5>
                          <ul className="build-form__feature-list">
                            {classFeatureOptions.map((feature) => (
                              <li key={feature}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="build-form__hint build-form__hint--muted">
                          Ce niveau n’accorde pas de nouvelle capacité de classe.
                        </p>
                      )}

                      {displayChoiceField ? (
                        <label className="build-form__level-summary">
                          Choix imposés par le niveau
                          <textarea
                            rows={2}
                            value={level.spells ?? ''}
                            onChange={(event) => updateLevel(index, { spells: event.target.value })}
                            placeholder="Notez les sorts appris, styles de combat, invocations, maîtrises…"
                          />
                        </label>
                      ) : null}

                      {subclassFeatures.length ? (
                        <div className="build-form__level-section">
                          <h5>Caractéristiques de sous-classe</h5>
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
                          {displaySubclassChoice ? (
                            <label>
                              Choix de sous-classe ou option liée
                              <textarea
                                rows={2}
                                value={level.subclass_choice ?? ''}
                                onChange={(event) => updateLevel(index, { subclass_choice: event.target.value })}
                                placeholder="Indiquez le serment, la tradition ou l’option sélectionnée."
                              />
                            </label>
                          ) : null}
                        </div>
                      ) : displaySubclassChoice ? (
                        <label>
                          Choix de sous-classe
                          <textarea
                            rows={2}
                            value={level.subclass_choice ?? ''}
                            onChange={(event) => updateLevel(index, { subclass_choice: event.target.value })}
                            placeholder="Précisez la sous-classe retenue."
                          />
                        </label>
                      ) : null}

                      {displayFeatField ? (
                        <label>
                          Don ou amélioration sélectionné(e)
                          <input
                            type="text"
                            value={level.feats ?? ''}
                            onChange={(event) => updateLevel(index, { feats: event.target.value })}
                            placeholder="Athlete, Ability Improvement…"
                          />
                        </label>
                      ) : null}

                      <label>
                        Classe prise à ce niveau
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
                        <p className="build-form__hint">
                          Sélectionnez la classe réellement prise en jeu pour ce niveau (utile pour les builds multi-classes).
                        </p>
                      </label>

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
