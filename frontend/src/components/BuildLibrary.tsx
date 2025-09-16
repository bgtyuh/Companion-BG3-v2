import { useMemo, useState } from 'react'
import type { Build, BuildLevel, CharacterClass, Race } from '../types'
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

export function BuildLibrary({ builds, races, classes, onCreate, onUpdate, onDelete }: BuildLibraryProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<Omit<Build, 'id'>>({
    name: '',
    race: '',
    class_name: '',
    subclass: '',
    notes: '',
    levels: [{ ...emptyLevel }],
  })
  function resetForm() {
    setForm({ name: '', race: '', class_name: '', subclass: '', notes: '', levels: [{ ...emptyLevel }] })
    setIsEditing(false)
    setSelectedId(null)
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

  const subclassOptions = useMemo(() => {
    if (!form.class_name) return []
    return classes.find((klass) => klass.name === form.class_name)?.subclasses.map((entry) => entry.name) ?? []
  }, [classes, form.class_name])

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
    resetForm()
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

  return (
    <Panel
      title="Concepteur de builds"
      subtitle="Documentez vos plans de progression niveau par niveau"
      actions={
        <button className="link" onClick={resetForm}>
          Nouveau build
        </button>
      }
    >
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
                  <button className="link link--danger" onClick={() => onDelete(build.id)}>
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
            {!builds.length ? <p className="empty">Enregistrez vos premiers builds pour les proposer à l'équipe.</p> : null}
          </ul>
        </div>
        <div className="build-library__details">
          <form
            className="build-form"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSubmit()
            }}
          >
            <h3>{isEditing ? 'Modifier le build' : 'Créer un build'}</h3>
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
              {form.levels.map((level, index) => (
                <div key={`${level.level}-${index}`} className="build-form__level">
                  <label>
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
                  <label>
                    Sorts / dons de classe
                    <textarea
                      rows={2}
                      value={level.spells ?? ''}
                      onChange={(event) => updateLevel(index, { spells: event.target.value })}
                    />
                  </label>
                  <label>
                    Dons
                    <textarea
                      rows={2}
                      value={level.feats ?? ''}
                      onChange={(event) => updateLevel(index, { feats: event.target.value })}
                    />
                  </label>
                  <label>
                    Spécialisation / multi-classe
                    <textarea
                      rows={2}
                      value={level.subclass_choice ?? level.multiclass_choice ?? ''}
                      onChange={(event) =>
                        updateLevel(index, {
                          subclass_choice: event.target.value,
                          multiclass_choice: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Note
                    <textarea
                      rows={2}
                      value={level.note ?? ''}
                      onChange={(event) => updateLevel(index, { note: event.target.value })}
                    />
                  </label>
                  <button type="button" className="link link--danger" onClick={() => removeLevel(index)}>
                    Retirer ce palier
                  </button>
                </div>
              ))}
            </div>
            <button type="submit">{isEditing ? 'Mettre à jour le build' : 'Enregistrer le build'}</button>
          </form>
        </div>
      </div>
    </Panel>
  )
}
