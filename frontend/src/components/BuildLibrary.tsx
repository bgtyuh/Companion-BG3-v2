import { useEffect, useMemo, useState } from 'react'
import type { Build, BuildLevel } from '../types'
import { Panel } from './Panel'

interface BuildLibraryProps {
  builds: Build[]
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
}

export function BuildLibrary({ builds, onCreate, onUpdate, onDelete }: BuildLibraryProps) {
  const [selectedId, setSelectedId] = useState<number | null>(builds[0]?.id ?? null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<Omit<Build, 'id'>>({
    name: '',
    race: '',
    class_name: '',
    subclass: '',
    notes: '',
    levels: [{ ...emptyLevel }],
  })

  const selectedBuild = useMemo(() => builds.find((build) => build.id === selectedId) ?? null, [builds, selectedId])

  useEffect(() => {
    if (!builds.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !builds.some((build) => build.id === selectedId)) {
      setSelectedId(builds[0].id)
    }
  }, [builds, selectedId])

  function resetForm() {
    setForm({ name: '', race: '', class_name: '', subclass: '', notes: '', levels: [{ ...emptyLevel }] })
    setIsEditing(false)
  }

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
      levels: build.levels.length ? build.levels.map((level) => ({ ...level })) : [{ ...emptyLevel }],
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
              <li key={build.id} className={build.id === selectedId ? 'active' : ''}>
                <button
                  className="link"
                  onClick={() => {
                    setSelectedId(build.id)
                    setIsEditing(false)
                  }}
                >
                  {build.name}
                </button>
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
          {selectedBuild && !isEditing ? (
            <div className="build-card">
              <h3>{selectedBuild.name}</h3>
              <div className="build-card__meta">
                {selectedBuild.race ? <span>{selectedBuild.race}</span> : null}
                {selectedBuild.class_name ? <span>{selectedBuild.class_name}</span> : null}
                {selectedBuild.subclass ? <span>{selectedBuild.subclass}</span> : null}
              </div>
              {selectedBuild.notes ? <p className="build-card__notes">{selectedBuild.notes}</p> : null}
              <div className="build-card__levels">
                {selectedBuild.levels.map((level) => (
                  <article key={level.id ?? level.level}>
                    <header>Niveau {level.level}</header>
                    <div className="build-card__grid">
                      <div>
                        <h4>Sorts</h4>
                        <p>{level.spells || '—'}</p>
                      </div>
                      <div>
                        <h4>Dons</h4>
                        <p>{level.feats || '—'}</p>
                      </div>
                      <div>
                        <h4>Spécialisations</h4>
                        <p>{level.subclass_choice || level.multiclass_choice || '—'}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

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
                <input
                  type="text"
                  value={form.race ?? ''}
                  onChange={(event) => setForm((state) => ({ ...state, race: event.target.value }))}
                />
              </label>
              <label>
                Classe
                <input
                  type="text"
                  value={form.class_name ?? ''}
                  onChange={(event) => setForm((state) => ({ ...state, class_name: event.target.value }))}
                />
              </label>
              <label>
                Sous-classe
                <input
                  type="text"
                  value={form.subclass ?? ''}
                  onChange={(event) => setForm((state) => ({ ...state, subclass: event.target.value }))}
                />
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
