import { useMemo, useState } from 'react'
import type { Build, BuildLevel, CharacterClass, Race, SubclassFeature } from '../types'
import { getProgressionHighlights } from '../utils/progression'
import { getClassLevelChoices } from '../utils/classLevelChoices'
import {
  createEmptyBuildSpellPlan,
  parseBuildSpellPlan,
  serializeBuildSpellPlan,
  type BuildSpellPlan,
  type BuildSpellReplacement,
} from '../utils/spells'
import { STATIC_SPELL_LIMITS } from '../data/spellLimits'
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

type BuildFormLevel = BuildLevel & { spellPlan: BuildSpellPlan; manualSpellDraft?: string }

type BuildFormState = Omit<Build, 'id' | 'levels'> & { levels: BuildFormLevel[] }

function splitFeatureList(raw?: string | null): string[] {
  if (!raw) {
    return []
  }
  return raw
    .split(/[,•/\n;]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== '-')
}

function mergeFeatureLists(...lists: Array<readonly string[]>): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const list of lists) {
    for (const entry of list) {
      const trimmed = entry.trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(trimmed)
    }
  }
  return merged
}

function normalizeForMatching(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function matchesKeywords(value: string, keywords: readonly string[]): boolean {
  if (!value) return false
  const normalized = normalizeForMatching(value)
  return keywords.some((keyword) => normalized.includes(keyword))
}

const FEAT_KEYWORDS = ['feat', 'improvement', 'don', 'asi', 'amelioration'] as const

interface SkillProficiencyInfo {
  limit: number | null
  options: string[]
}

function normalizeSkillSelections(skills: readonly string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const skill of skills) {
    const trimmed = skill.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(trimmed)
  }
  return normalized
}

const SKILL_LIMIT_REGEX = /choose\s+(\d+)/i

function parseSkillProficiencies(value?: string | null): SkillProficiencyInfo {
  if (!value) {
    return { limit: null, options: [] }
  }
  const normalized = value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return { limit: null, options: [] }
  }
  const limitMatch = normalized.match(SKILL_LIMIT_REGEX)
  const limit = limitMatch ? Number.parseInt(limitMatch[1], 10) : null
  let optionsSection = normalized
  const colonIndex = normalized.indexOf(':')
  if (colonIndex >= 0) {
    optionsSection = normalized.slice(colonIndex + 1)
  } else if (limitMatch?.index !== undefined) {
    optionsSection = normalized.slice(limitMatch.index + limitMatch[0].length)
  }
  optionsSection = optionsSection
    .replace(/\b(?:from|among|parmi|depuis)\b/gi, ' ')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.;]/g, ' ')
  const rawOptions = optionsSection
    .split(/[,/]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  return {
    limit,
    options: normalizeSkillSelections(rawOptions),
  }
}

function createEmptyLevel(level = 1): BuildFormLevel {
  return {
    level,
    spells: '',
    feats: '',
    subclass_choice: '',
    multiclass_choice: '',
    note: '',
    spellPlan: createEmptyBuildSpellPlan(),
    manualSpellDraft: '',
  }
}

function formatSpellCount(count: number): string {
  return `${count} sort${count > 1 ? 's' : ''}`
}

function getKnownSpellsBeforeLevel(levels: BuildFormLevel[], index: number): string[] {
  const known: string[] = []
  for (let i = 0; i < index; i += 1) {
    const { learned, replacements } = levels[i].spellPlan
    for (const spell of learned) {
      if (!known.includes(spell)) {
        known.push(spell)
      }
    }
    for (const replacement of replacements) {
      if (replacement.previous) {
        const position = known.indexOf(replacement.previous)
        if (position >= 0) {
          known.splice(position, 1)
        }
      }
      if (replacement.next && !known.includes(replacement.next)) {
        known.push(replacement.next)
      }
    }
  }
  return known
}

function filterSpellPlanForOptions(plan: BuildSpellPlan, availableSpells: string[]): BuildSpellPlan {
  if (!availableSpells.length) {
    return {
      ...plan,
      learned: [...plan.learned],
      replacements: plan.replacements.map((entry) => ({ previous: entry.previous, next: '' })),
    }
  }
  const allowed = new Set(availableSpells)
  return {
    ...plan,
    learned: plan.learned.filter((spell) => allowed.has(spell)),
    replacements: plan.replacements.map((entry) => ({
      previous: entry.previous,
      next: entry.next && allowed.has(entry.next) ? entry.next : '',
    })),
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
  const [form, setForm] = useState<BuildFormState>({
    name: '',
    race: '',
    class_name: '',
    subclass: '',
    notes: '',
    skill_choices: [],
    levels: [createEmptyLevel()],
  })
  function resetForm(hideForm = false) {
    setForm({
      name: '',
      race: '',
      class_name: '',
      subclass: '',
      notes: '',
      skill_choices: [],
      levels: [createEmptyLevel()],
    })
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

  const skillOptionsByClass = useMemo(() => {
    const map = new Map<string, SkillProficiencyInfo>()
    for (const klass of classes) {
      map.set(klass.name, parseSkillProficiencies(klass.skill_proficiencies))
    }
    return map
  }, [classes])

  const spellsByClass = useMemo(() => {
    const map = new Map<string, Map<number, string[]>>()
    for (const klass of classes) {
      const levelMap = new Map<number, string[]>()
      for (const group of klass.spells_learned ?? []) {
        levelMap.set(group.level, [...group.spells])
      }
      map.set(klass.name, levelMap)
    }
    return map
  }, [classes])

  const spellLimitsByClass = useMemo(() => {
    const map = new Map<string, Map<number, number>>()
    for (const klass of classes) {
      const levelMap = new Map<number, number>()

      const staticLimits = STATIC_SPELL_LIMITS[klass.name as keyof typeof STATIC_SPELL_LIMITS]
      if (staticLimits) {
        for (const [level, limit] of Object.entries(staticLimits)) {
          levelMap.set(Number.parseInt(level, 10), limit)
        }
      }

      const sortedProgression = [...(klass.progression ?? [])].sort((a, b) => a.level - b.level)
      let previousSpellsKnown = 0
      let previousCantripsKnown = 0
      for (const entry of sortedProgression) {
        const spellsKnown = typeof entry.spells_known === 'number' && Number.isFinite(entry.spells_known)
          ? entry.spells_known
          : previousSpellsKnown
        const cantripsKnown = typeof entry.cantrips_known === 'number' && Number.isFinite(entry.cantrips_known)
          ? entry.cantrips_known
          : previousCantripsKnown
        const newSpells = Math.max(0, spellsKnown - previousSpellsKnown)
        const newCantrips = Math.max(0, cantripsKnown - previousCantripsKnown)
        if (newSpells > 0 || newCantrips > 0) {
          levelMap.set(entry.level, newSpells + newCantrips)
        }
        previousSpellsKnown = spellsKnown
        previousCantripsKnown = cantripsKnown
      }
      map.set(klass.name, levelMap)
    }
    return map
  }, [classes])

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

  const selectedClassSkillInfo = useMemo<SkillProficiencyInfo>(
    () =>
      selectedClass
        ? skillOptionsByClass.get(selectedClass.name) ?? { limit: null, options: [] }
        : { limit: null, options: [] },
    [selectedClass, skillOptionsByClass],
  )

  const availableSkillOptions = selectedClassSkillInfo.options
  const selectedSkillsForClass = form.skill_choices.filter((skill) =>
    availableSkillOptions.includes(skill),
  )
  const extraSkillSelections = form.skill_choices.filter(
    (skill) => !availableSkillOptions.includes(skill),
  )
  const skillSelectionLimit = selectedClassSkillInfo.limit
  const remainingSkillChoices =
    skillSelectionLimit != null ? skillSelectionLimit - selectedSkillsForClass.length : null
  const hasReachedSkillLimit =
    remainingSkillChoices != null ? remainingSkillChoices <= 0 : false

  const classHighlights = useMemo(() => {
    if (!selectedClass) return []
    const entries: Array<{ label: string; value: string | null | undefined }> = [
      { label: 'Points de vie (niveau 1)', value: selectedClass.hit_points_at_level1 },
      { label: 'Points de vie par niveau', value: selectedClass.hit_points_on_level_up },
      { label: 'Caractéristiques clés', value: selectedClass.key_abilities },
      { label: 'Jets de sauvegarde', value: selectedClass.saving_throw_proficiencies },
      { label: 'Maîtrises d’équipement', value: selectedClass.equipment_proficiencies },
      { label: "Caractéristique d'incantation", value: selectedClass.spellcasting_ability },
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
    const { levels, skill_choices, ...rest } = form
    const normalizedSkillChoices = normalizeSkillSelections(skill_choices)
    const payload: Omit<Build, 'id'> = {
      ...rest,
      skill_choices: normalizedSkillChoices,
      levels: [...levels]
        .filter((entry) => entry.level)
        .map((entry) => ({
          level: entry.level,
          spells: serializeBuildSpellPlan(entry.spellPlan),
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
      skill_choices: normalizeSkillSelections(build.skill_choices ?? []),
      levels: build.levels.length
        ? build.levels.map((level) => ({
            id: level.id,
            level: level.level,
            spells: level.spells ?? '',
            feats: level.feats ?? '',
            subclass_choice: level.subclass_choice ?? '',
            multiclass_choice: level.multiclass_choice ?? '',
            note: level.note ?? '',
            spellPlan: parseBuildSpellPlan(level.spells ?? ''),
            manualSpellDraft: '',
          }))
        : [createEmptyLevel()],
    })
    setSelectedId(build.id)
    setIsEditing(true)
    setIsFormVisible(true)
  }

  function handleToggleSkillChoice(skill: string) {
    setForm((state) => {
      const className = state.class_name ?? ''
      const details = className
        ? skillOptionsByClass.get(className) ?? { limit: null, options: [] }
        : { limit: null, options: [] }
      if (!details.options.includes(skill)) {
        return state
      }
      const withinOptions = state.skill_choices.filter((entry) => details.options.includes(entry))
      const outsideOptions = state.skill_choices.filter(
        (entry) => !details.options.includes(entry),
      )
      const isSelected = withinOptions.includes(skill)
      if (!isSelected) {
        if (details.limit != null && withinOptions.length >= details.limit) {
          return state
        }
        const nextWithin = normalizeSkillSelections([...withinOptions, skill])
        return {
          ...state,
          skill_choices: normalizeSkillSelections([...outsideOptions, ...nextWithin]),
        }
      }
      const nextWithin = withinOptions.filter((entry) => entry !== skill)
      return {
        ...state,
        skill_choices: normalizeSkillSelections([...outsideOptions, ...nextWithin]),
      }
    })
  }

  function updateLevel(index: number, updates: Partial<BuildFormLevel>) {
    setForm((state) => {
      const nextLevels: BuildFormLevel[] = state.levels.map((level, i): BuildFormLevel => {
        if (i !== index) {
          return level
        }
        const merged: BuildFormLevel = { ...level, ...updates }
        if (updates.level !== undefined || updates.multiclass_choice !== undefined) {
          const className = merged.multiclass_choice || state.class_name || ''
          const availableSpells = className ? spellsByClass.get(className)?.get(merged.level) ?? [] : []
          merged.spellPlan = filterSpellPlanForOptions(merged.spellPlan, availableSpells)
        }
        return merged
      })
      return { ...state, levels: nextLevels }
    })
  }

  function handleManualSpellDraftChange(index: number, value: string) {
    updateLevel(index, { manualSpellDraft: value })
  }

  function handleAddManualSpell(index: number) {
    setForm((state) => {
      const currentLevel = state.levels[index]
      if (!currentLevel) {
        return state
      }
      const draft = (currentLevel.manualSpellDraft ?? '').trim()
      if (!draft) {
        return state
      }
      const classNameForLevel = currentLevel.multiclass_choice || state.class_name || ''
      const limit = classNameForLevel
        ? spellLimitsByClass.get(classNameForLevel)?.get(currentLevel.level)
        : undefined
      if (
        limit !== undefined &&
        limit !== null &&
        currentLevel.spellPlan.learned.length >= limit
      ) {
        return state
      }
      const alreadyKnown = currentLevel.spellPlan.learned.some(
        (spell) => spell.localeCompare(draft, 'fr', { sensitivity: 'base' }) === 0,
      )
      if (alreadyKnown) {
        return {
          ...state,
          levels: state.levels.map((level, levelIndex) =>
            levelIndex === index ? { ...level, manualSpellDraft: '' } : level,
          ),
        }
      }
      const nextLearned = [...currentLevel.spellPlan.learned, draft].sort((a, b) =>
        a.localeCompare(b, 'fr'),
      )
      const nextLevels = state.levels.map((level, levelIndex) =>
        levelIndex === index
          ? {
              ...level,
              manualSpellDraft: '',
              spellPlan: {
                ...level.spellPlan,
                learned: nextLearned,
              },
            }
          : level,
      )
      return { ...state, levels: nextLevels }
    })
  }

  function handleRemoveManualSpell(index: number, spell: string) {
    updateSpellPlan(index, (plan) => ({
      ...plan,
      learned: plan.learned.filter((entry) => entry !== spell),
    }))
  }

  function updateSpellPlan(index: number, updater: (plan: BuildSpellPlan) => BuildSpellPlan) {
    setForm((state) => {
      const nextLevels: BuildFormLevel[] = state.levels.map((level, i): BuildFormLevel =>
        i === index
          ? {
              ...level,
              spellPlan: updater(level.spellPlan),
            }
          : level,
      )
      return { ...state, levels: nextLevels }
    })
  }

  function handleToggleLearnedSpell(index: number, spell: string) {
    setForm((state) => {
      const currentLevel = state.levels[index]
      if (!currentLevel) {
        return state
      }
      const classNameForLevel = currentLevel.multiclass_choice || state.class_name || ''
      const limit = classNameForLevel
        ? spellLimitsByClass.get(classNameForLevel)?.get(currentLevel.level)
        : undefined
      const isSelected = currentLevel.spellPlan.learned.includes(spell)
      if (!isSelected && limit !== undefined && limit !== null && currentLevel.spellPlan.learned.length >= limit) {
        return state
      }
      const nextLearned = isSelected
        ? currentLevel.spellPlan.learned.filter((entry) => entry !== spell)
        : [...currentLevel.spellPlan.learned, spell].sort((a, b) => a.localeCompare(b, 'fr'))
      const nextLevels = state.levels.map((level, levelIndex) =>
        levelIndex === index
          ? {
              ...level,
              spellPlan: {
                ...level.spellPlan,
                learned: nextLearned,
              },
            }
          : level,
      )
      return { ...state, levels: nextLevels }
    })
  }

  function handleAddReplacement(index: number) {
    updateSpellPlan(index, (plan) => ({
      ...plan,
      replacements: [...plan.replacements, { previous: '', next: '' }],
    }))
  }

  function handleUpdateReplacement(
    levelIndex: number,
    replacementIndex: number,
    updates: Partial<BuildSpellReplacement>,
  ) {
    updateSpellPlan(levelIndex, (plan) => ({
      ...plan,
      replacements: plan.replacements.map((entry, index) =>
        index === replacementIndex
          ? {
              previous: updates.previous ?? entry.previous,
              next: updates.next ?? entry.next,
            }
          : entry,
      ),
    }))
  }

  function handleRemoveReplacement(levelIndex: number, replacementIndex: number) {
    updateSpellPlan(levelIndex, (plan) => ({
      ...plan,
      replacements: plan.replacements.filter((_, index) => index !== replacementIndex),
    }))
  }

  function addLevel() {
    setForm((state) => {
      const nextLevels: BuildFormLevel[] = [
        ...state.levels,
        createEmptyLevel(Math.min(12, state.levels.length + 1)),
      ]
      return { ...state, levels: nextLevels }
    })
  }

  function removeLevel(index: number) {
    setForm((state) => {
      const nextLevels: BuildFormLevel[] = state.levels.filter((_, i) => i !== index)
      return { ...state, levels: nextLevels }
    })
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
                    setForm((state) => {
                      const nextLevels: BuildFormLevel[] = state.levels.map((level): BuildFormLevel => {
                        if (level.multiclass_choice) {
                          return level
                        }
                        const availableSpells = spellsByClass.get(nextClass)?.get(level.level) ?? []
                        return {
                          ...level,
                          spellPlan: filterSpellPlanForOptions(level.spellPlan, availableSpells),
                        }
                      })
                      const allowedSkillOptions = skillOptionsByClass.get(nextClass)?.options ?? []
                      return {
                        ...state,
                        class_name: nextClass,
                        subclass: '',
                        skill_choices: normalizeSkillSelections(
                          state.skill_choices.filter((skill) => allowedSkillOptions.includes(skill)),
                        ),
                        levels: nextLevels,
                      }
                    })
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
                  {availableSkillOptions.length ? (
                    <div className="build-form__skill-choices">
                      <div className="build-form__skill-choices-header">
                        <h5>Compétences de classe</h5>
                        <p className="build-form__hint build-form__hint--muted">
                          {skillSelectionLimit != null
                            ? `Choisissez jusqu'à ${skillSelectionLimit} compétence${skillSelectionLimit > 1 ? 's' : ''}.`
                            : 'Sélectionnez les compétences que vous visez avec ce build.'}
                        </p>
                      </div>
                      <div className="build-form__skill-options">
                        {availableSkillOptions.map((skill) => {
                          const isChecked = selectedSkillsForClass.includes(skill)
                          const disableAdditional = !isChecked && hasReachedSkillLimit
                          return (
                            <label key={skill} className="build-form__skill-option">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={disableAdditional}
                                onChange={() => handleToggleSkillChoice(skill)}
                              />
                              <span>{skill}</span>
                            </label>
                          )
                        })}
                      </div>
                      {skillSelectionLimit != null ? (
                        <p className="build-form__hint">
                          {remainingSkillChoices != null && remainingSkillChoices > 0
                            ? `Vous pouvez encore choisir ${remainingSkillChoices} compétence${remainingSkillChoices > 1 ? 's' : ''}.`
                            : `Limite atteinte : ${selectedSkillsForClass.length} compétence${selectedSkillsForClass.length > 1 ? 's' : ''} sélectionnée${selectedSkillsForClass.length > 1 ? 's' : ''}.`}
                        </p>
                      ) : null}
                      {extraSkillSelections.length ? (
                        <p className="build-form__hint build-form__hint--muted">
                          Compétences supplémentaires conservées : {extraSkillSelections.join(', ')}.
                        </p>
                      ) : null}
                    </div>
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
                  const plan = level.spellPlan
                  const levelClass =
                    level.multiclass_choice && level.multiclass_choice !== ''
                      ? classes.find((klass) => klass.name === level.multiclass_choice) ?? null
                      : selectedClass
                  const classNameForLevel = levelClass?.name ?? ''
                  const classProgression = levelClass?.progression.find((entry) => entry.level === level.level)
                  const levelChoices = classNameForLevel
                    ? getClassLevelChoices(classNameForLevel, level.level)
                    : []
                  const classFeatureOptions = mergeFeatureLists(
                    levelChoices,
                    splitFeatureList(classProgression?.features),
                  )
                  const progressionHighlights = getProgressionHighlights(classProgression)
                  const subclassFeatures = subclassFeaturesByLevel.get(level.level) ?? []
                  const shouldSuggestFeat = classFeatureOptions.some((feature) =>
                    matchesKeywords(feature, FEAT_KEYWORDS),
                  )
                  const availableSpells = classNameForLevel
                    ? spellsByClass.get(classNameForLevel)?.get(level.level) ?? []
                    : []
                  const spellLimit = classNameForLevel
                    ? spellLimitsByClass.get(classNameForLevel)?.get(level.level) ?? null
                    : null
                  const remainingSpellSlots =
                    typeof spellLimit === 'number' ? spellLimit - plan.learned.length : null
                  const hasExceededSpellLimit =
                    typeof remainingSpellSlots === 'number' ? remainingSpellSlots < 0 : false
                  const hasReachedSpellLimit =
                    typeof remainingSpellSlots === 'number' ? remainingSpellSlots <= 0 : false
                  let spellLimitMessage: string | null = null
                  let spellLimitMessageClass = 'build-form__hint build-form__hint--muted'
                  if (typeof spellLimit === 'number') {
                    if (hasExceededSpellLimit && typeof remainingSpellSlots === 'number') {
                      spellLimitMessage = `Limite dépassée : retirez ${formatSpellCount(Math.abs(remainingSpellSlots))}.`
                      spellLimitMessageClass = 'build-form__hint'
                    } else if (spellLimit === 0) {
                      spellLimitMessage = "Ce niveau ne permet pas d'apprendre de nouveau sort."
                    } else if (hasReachedSpellLimit) {
                      spellLimitMessage = `Limite atteinte : vous avez sélectionné ${formatSpellCount(spellLimit)}.`
                      spellLimitMessageClass = 'build-form__hint'
                    } else if (typeof remainingSpellSlots === 'number' && remainingSpellSlots > 0) {
                      spellLimitMessage = `Vous pouvez encore sélectionner ${formatSpellCount(remainingSpellSlots)}.`
                    }
                  }
                  const knownSpellsBefore = getKnownSpellsBeforeLevel(form.levels, index)
                  const manualSpellDraft = level.manualSpellDraft ?? ''
                  const displayFeatField = shouldSuggestFeat || Boolean(level.feats)
                  const displaySpellsSection =
                    availableSpells.length > 0 ||
                    plan.learned.length > 0 ||
                    plan.replacements.length > 0 ||
                    knownSpellsBefore.length > 0

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
                        ) : levelClass ? (
                          <p className="build-form__hint build-form__hint--muted">
                            Aucun changement majeur pour ce niveau.
                          </p>
                        ) : (
                          <p className="build-form__hint build-form__hint--muted">
                            Choisissez une classe pour afficher sa progression détaillée.
                          </p>
                        )}
                      </div>

                      {displaySpellsSection ? (
                        <div className="build-form__level-section build-form__level-section--spells">
                          <h5>Sorts à apprendre ou à ajuster</h5>
                          {availableSpells.length ? (
                            <div className="build-form__spell-options">
                              {availableSpells.map((spell) => {
                                const isChecked = plan.learned.includes(spell)
                                const disableAdditionalSpells =
                                  !isChecked && typeof spellLimit === 'number' && hasReachedSpellLimit
                                return (
                                  <label key={spell} className="build-form__spell-option">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={disableAdditionalSpells}
                                      onChange={() => handleToggleLearnedSpell(index, spell)}
                                    />
                                    <span>{spell}</span>
                                  </label>
                                )
                              })}
                            </div>
                          ) : (
                            <p className="build-form__hint build-form__hint--muted">
                              Aucun sort supplémentaire n'est proposé pour ce niveau.
                            </p>
                          )}
                          {spellLimitMessage ? (
                            <p className={spellLimitMessageClass}>{spellLimitMessage}</p>
                          ) : null}
                          {plan.learned.length && !availableSpells.length ? (
                            <div className="build-form__manual-spell-list">
                              <p className="build-form__hint build-form__hint--muted">
                                Ces sorts ont été ajoutés manuellement pour ce niveau.
                              </p>
                              <ul>
                                {plan.learned.map((spell) => (
                                  <li key={spell}>
                                    <span>{spell}</span>
                                    <button
                                      type="button"
                                      className="link link--danger"
                                      onClick={() => handleRemoveManualSpell(index, spell)}
                                    >
                                      Retirer
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {!availableSpells.length ? (
                            <div className="build-form__manual-spell-entry">
                              <label>
                                Ajouter un sort manuellement
                                <div className="build-form__manual-spell-controls">
                                  <input
                                    type="text"
                                    value={manualSpellDraft}
                                    onChange={(event) =>
                                      handleManualSpellDraftChange(index, event.target.value)
                                    }
                                    placeholder="Nom du sort"
                                  />
                                  <button type="button" className="link" onClick={() => handleAddManualSpell(index)}>
                                    Ajouter
                                  </button>
                                </div>
                                <p className="build-form__hint build-form__hint--muted">
                                  Utilisez ce champ lorsque aucun catalogue de sorts n'est disponible pour ce niveau.
                                </p>
                              </label>
                            </div>
                          ) : null}
                          {knownSpellsBefore.length || plan.replacements.length ? (
                            <div className="build-form__spell-replacements">
                              <h6>Remplacements possibles</h6>
                              {plan.replacements.map((replacement: BuildSpellReplacement, replacementIndex) => (
                                <div
                                  key={`replacement-${replacementIndex}`}
                                  className="build-form__spell-replacement-row"
                                >
                                  <select
                                    value={replacement.previous}
                                    onChange={(event) =>
                                      handleUpdateReplacement(index, replacementIndex, {
                                        previous: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">—</option>
                                    {knownSpellsBefore.map((spell) => (
                                      <option key={spell} value={spell}>
                                        {spell}
                                      </option>
                                    ))}
                                  </select>
                                  <span aria-hidden="true">→</span>
                                  <select
                                    value={replacement.next}
                                    onChange={(event) =>
                                      handleUpdateReplacement(index, replacementIndex, {
                                        next: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">—</option>
                                    {availableSpells.map((spell) => (
                                      <option key={spell} value={spell}>
                                        {spell}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="link link--danger"
                                    onClick={() => handleRemoveReplacement(index, replacementIndex)}
                                  >
                                    Retirer
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="link"
                                onClick={() => handleAddReplacement(index)}
                                disabled={!knownSpellsBefore.length}
                              >
                                Ajouter un remplacement
                              </button>
                              <p className="build-form__hint build-form__hint--muted">
                                Les lanceurs de sorts peuvent échanger un sort connu contre un nouveau lors d'un passage de
                                niveau.
                              </p>
                            </div>
                          ) : null}
                        </div>
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
                        </div>
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

                      <div className="build-form__level-actions">
                        <button
                          type="button"
                          className="link link--danger"
                          onClick={() => removeLevel(index)}
                        >
                          Retirer ce palier
                        </button>
                        <button type="button" className="link" onClick={addLevel}>
                          Ajouter un niveau
                        </button>
                      </div>
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
