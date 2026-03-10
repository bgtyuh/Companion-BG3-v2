import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useLocalStorage } from '../hooks'
import type {
  AbilityScoreKey,
  Background,
  Build,
  CharacterClass,
  EquipmentCollections,
  EquipmentSlotKey,
  PartyEquipment,
  PartyMember,
  Race,
  Spell,
} from '../types'
import { equipmentSlotKeys } from '../types'
import { computeBuildKnownSpells, getSpellLevelShortLabel, sortSpellsByLevel } from '../utils/spells'
import { downloadJSON, readJSONFile } from '../utils/file'
import { equipmentSlotLabels, equipmentSlotOrder } from '../utils/equipment'
import { computePartyMetrics, PARTY_ACT_OPTIONS, PARTY_ROLE_OPTIONS } from '../utils/party'
import { createVersionedPartyExport, extractImportedMemberEntries } from '../utils/partyImport'
import { CharacterSheet } from './CharacterSheet'
import { Panel } from './Panel'
import { PartyOverviewPanel } from './PartyOverviewPanel'

interface PartyPlannerProps {
  builds: Build[]
  races: Race[]
  classes: CharacterClass[]
  spells: Spell[]
  backgrounds: Background[]
  equipment: EquipmentCollections
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

function isValidAbilityScores(value: unknown): value is Record<AbilityScoreKey, number> {
  if (!isRecord(value)) return false
  return abilityKeys.every((key) => {
    const score = value[key]
    return typeof score === 'number' && Number.isFinite(score)
  })
}

function isPartyEquipment(
  value: unknown,
): value is Partial<Record<EquipmentSlotKey, string>> {
  if (value === undefined) return true
  if (!isRecord(value)) return false
  return equipmentSlotKeys.every((key) => value[key] === undefined || typeof value[key] === 'string')
}

function isValidPartyMember(value: unknown): value is PartyMember {
  if (!isRecord(value)) return false

  if (typeof value.id !== 'string') return false
  if (typeof value.name !== 'string') return false
  if (typeof value.level !== 'number' || !Number.isFinite(value.level) || !Number.isInteger(value.level)) return false
  if (!isValidAbilityScores(value.abilityScores)) return false

  if (!isStringArray(value.skills)) return false
  if (!isStringArray(value.spells)) return false

  if (value.race !== undefined && typeof value.race !== 'string') return false
  if (value.subrace !== undefined && typeof value.subrace !== 'string') return false
  if (value.class_name !== undefined && typeof value.class_name !== 'string') return false
  if (value.subclass !== undefined && typeof value.subclass !== 'string') return false
  if (value.background !== undefined && typeof value.background !== 'string') return false
  if (value.act !== undefined && typeof value.act !== 'string') return false
  if (value.role !== undefined && typeof value.role !== 'string') return false
  if (!isPartyEquipment(value.equipment)) return false
  if (value.notes !== undefined && typeof value.notes !== 'string') return false

  if (value.buildId !== undefined && typeof value.buildId !== 'number') return false

  return true
}

type PartyMemberInput = Omit<PartyMember, 'equipment'> & {
  equipment?: unknown
  equippedArmour?: unknown
  equippedWeapons?: unknown
  act?: unknown
  role?: unknown
}

function sanitizeMember(member: PartyMemberInput): PartyMember {
  const trimmedName = member.name.trim()
  const sanitizedEquipment: PartyEquipment = {}
  const providedEquipment = isPartyEquipment(member.equipment) ? member.equipment ?? {} : {}

  for (const key of equipmentSlotKeys) {
    const value = providedEquipment[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        sanitizedEquipment[key] = trimmed
      }
    }
  }

  if (typeof member.equippedArmour === 'string') {
    const trimmed = member.equippedArmour.trim()
    if (trimmed && sanitizedEquipment.armour === undefined) {
      sanitizedEquipment.armour = trimmed
    }
  }

  if (isStringArray(member.equippedWeapons)) {
    const [mainHand, offHand, ranged] = member.equippedWeapons

    const mapLegacyWeapon = (value: string | undefined) => {
      if (!value) return undefined
      const trimmed = value.trim()
      return trimmed || undefined
    }

    const mainHandValue = mapLegacyWeapon(mainHand)
    if (mainHandValue && sanitizedEquipment.mainHand === undefined) {
      sanitizedEquipment.mainHand = mainHandValue
    }

    const offHandValue = mapLegacyWeapon(offHand)
    if (offHandValue && sanitizedEquipment.offHand === undefined) {
      sanitizedEquipment.offHand = offHandValue
    }

    const rangedValue = mapLegacyWeapon(ranged)
    if (rangedValue && sanitizedEquipment.ranged === undefined) {
      sanitizedEquipment.ranged = rangedValue
    }
  }

  const equipment: PartyEquipment = Object.keys(sanitizedEquipment).length ? sanitizedEquipment : {}

  return {
    id: member.id,
    name: trimmedName,
    race: typeof member.race === 'string' && member.race.trim() ? member.race.trim() : undefined,
    subrace: typeof member.subrace === 'string' && member.subrace.trim() ? member.subrace.trim() : undefined,
    class_name:
      typeof member.class_name === 'string' && member.class_name.trim() ? member.class_name.trim() : undefined,
    subclass: typeof member.subclass === 'string' && member.subclass.trim() ? member.subclass.trim() : undefined,
    background:
      typeof member.background === 'string' && member.background.trim() ? member.background.trim() : undefined,
    act: typeof member.act === 'string' && member.act.trim() ? member.act.trim() : undefined,
    role: typeof member.role === 'string' && member.role.trim() ? member.role.trim() : undefined,
    level: member.level,
    buildId: typeof member.buildId === 'number' ? member.buildId : undefined,
    abilityScores: abilityKeys.reduce<PartyMember['abilityScores']>((scores, key) => {
      scores[key] = member.abilityScores[key]
      return scores
    }, {} as PartyMember['abilityScores']),
    skills: [...member.skills],
    equipment,
    spells: [...member.spells],
    notes: typeof member.notes === 'string' && member.notes.trim() ? member.notes.trim() : undefined,
  }
}

function parseImportedMembers(data: unknown): PartyMember[] | null {
  const importedEntries = extractImportedMemberEntries(data)
  if (!importedEntries) return null
  if (!importedEntries.every((item) => isValidPartyMember(item))) return null

  return importedEntries.map((member) => sanitizeMember(member as PartyMemberInput))
}

function createMemberEditSignature(member: PartyMember): string {
  const sanitized = sanitizeMember(member as PartyMemberInput)
  const sortedEquipment = equipmentSlotKeys.reduce<PartyEquipment>((acc, key) => {
    const value = sanitized.equipment?.[key]
    if (value) {
      acc[key] = value
    }
    return acc
  }, {})

  return JSON.stringify({
    ...sanitized,
    level: sanitized.level,
    skills: [...sanitized.skills].sort((a, b) => a.localeCompare(b, 'fr')),
    spells: [...sanitized.spells].sort((a, b) => a.localeCompare(b, 'fr')),
    equipment: sortedEquipment,
  })
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
    skills: [],
    equipment: {},
    spells: [],
    notes: '',
  }
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function normalizeStringList(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(trimmed)
  }

  return normalized.sort((a, b) => a.localeCompare(b, 'fr'))
}

function extractRecommendedEquipment(build: Build | null | undefined): Partial<Record<EquipmentSlotKey, string>> {
  if (!build) return {}
  const raw = (build as { recommended_equipment?: unknown }).recommended_equipment
  if (!raw || typeof raw !== 'object') {
    return {}
  }

  const result: Partial<Record<EquipmentSlotKey, string>> = {}
  for (const slot of equipmentSlotKeys) {
    const value = (raw as Record<string, unknown>)[slot]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        result[slot] = trimmed
      }
    }
  }
  return result
}

function getLatestSubclassChoice(build: Build, upToLevel: number): string | null {
  const relevantLevels = build.levels
    .filter((level) => Number.isInteger(level.level) && level.level <= upToLevel)
    .sort((a, b) => a.level - b.level)

  for (let index = relevantLevels.length - 1; index >= 0; index -= 1) {
    const choice = relevantLevels[index]?.subclass_choice?.trim()
    if (choice) {
      return choice
    }
  }

  return build.subclass?.trim() ?? null
}

export function PartyPlanner({
  builds,
  races,
  classes,
  spells,
  backgrounds,
  equipment,
}: PartyPlannerProps) {
  const {
    armours,
    weapons,
    shields,
    clothing,
    headwears,
    handwears,
    footwears,
    cloaks,
    rings,
    amulets,
  } = equipment

  const backgroundOptions = useMemo(
    () => backgrounds.map((item) => item.name).sort((a, b) => a.localeCompare(b, 'fr')),
    [backgrounds],
  )
  const backgroundMap = useMemo(
    () => new Map(backgrounds.map((item) => [item.name, item])),
    [backgrounds],
  )
  const weaponOptions = useMemo(() => weapons.map((item) => item.name), [weapons])
  const armourOptions = useMemo(() => armours.map((item) => item.name), [armours])
  const shieldOptions = useMemo(() => shields.map((item) => item.name), [shields])
  const headwearOptions = useMemo(() => headwears.map((item) => item.name), [headwears])
  const handwearOptions = useMemo(() => handwears.map((item) => item.name), [handwears])
  const footwearOptions = useMemo(() => footwears.map((item) => item.name), [footwears])
  const cloakOptions = useMemo(() => cloaks.map((item) => item.name), [cloaks])
  const amuletOptions = useMemo(() => amulets.map((item) => item.name), [amulets])
  const ringOptions = useMemo(() => rings.map((item) => item.name), [rings])
  const clothingOptions = useMemo(() => clothing.map((item) => item.name), [clothing])
  const [storedMembers, setMembers] = useLocalStorage<PartyMember[]>('bg3-companion-party', [])
  const members = useMemo(
    () => storedMembers.map((member) => sanitizeMember(member as PartyMemberInput)),
    [storedMembers],
  )
  const [selectedId, setSelectedId] = useState<string | null>(members[0]?.id ?? null)
  const [editingMember, setEditingMember] = useState<PartyMember | null>(null)
  const [spellQuery, setSpellQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previousBuildSignatureRef = useRef<string | null>(null)
  const [editingBaseline, setEditingBaseline] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{ name?: string; level?: string }>({})
  const [plannerMessage, setPlannerMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const editingBuild = useMemo(
    () => (editingMember?.buildId != null ? builds.find((build) => build.id === editingMember.buildId) ?? null : null),
    [builds, editingMember?.buildId],
  )

  const recommendedSkills = useMemo(
    () => (editingBuild ? normalizeStringList(editingBuild.skill_choices ?? []) : []),
    [editingBuild],
  )
  const recommendedSkillsSet = useMemo(() => new Set(recommendedSkills), [recommendedSkills])

  const recommendedSubclass = useMemo(
    () => (editingBuild && editingMember ? getLatestSubclassChoice(editingBuild, editingMember.level) : null),
    [editingBuild, editingMember],
  )

  const recommendedEquipment = useMemo(() => extractRecommendedEquipment(editingBuild), [editingBuild])

  const buildSpellTargets = useMemo(
    () =>
      editingBuild && editingMember
        ? computeBuildKnownSpells(editingBuild.levels ?? [], editingMember.level)
        : null,
    [editingBuild, editingMember],
  )

  const buildSkillSignature = useMemo(() => {
    if (!editingMember?.buildId) {
      return ''
    }
    return `${editingMember.buildId}:${recommendedSkills.join('|')}`
  }, [editingMember?.buildId, recommendedSkills])

  const partyMetrics = useMemo(
    () =>
      computePartyMetrics({
        members,
        spells,
        equipment,
        skillsCatalog: skillOptions,
        roleCatalog: Array.from(PARTY_ROLE_OPTIONS),
      }),
    [members, spells, equipment],
  )

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
    const trimmed = spellQuery.trim().toLowerCase()
    const matches = trimmed
      ? spells.filter((spell) => spell.name.toLowerCase().includes(trimmed))
      : spells
    return matches.slice().sort(sortSpellsByLevel).slice(0, 8)
  }, [spells, spellQuery])

  const offHandOptions = useMemo(() => {
    const collator = new Intl.Collator('fr')
    return Array.from(new Set([...weaponOptions, ...shieldOptions])).sort((a, b) => collator.compare(a, b))
  }, [shieldOptions, weaponOptions])

  const equipmentOptions = useMemo<Record<EquipmentSlotKey, string[]>>(
    () => ({
      headwear: headwearOptions,
      amulet: amuletOptions,
      cloak: cloakOptions,
      armour: armourOptions,
      handwear: handwearOptions,
      footwear: footwearOptions,
      ring1: ringOptions,
      ring2: ringOptions,
      clothing: clothingOptions,
      mainHand: weaponOptions,
      offHand: offHandOptions,
      ranged: weaponOptions,
    }),
    [
      amuletOptions,
      armourOptions,
      cloakOptions,
      clothingOptions,
      footwearOptions,
      handwearOptions,
      headwearOptions,
      offHandOptions,
      ringOptions,
      weaponOptions,
    ],
  )

  const backgroundSelection = editingMember?.background?.trim() ?? ''
  const selectedBackgroundInfo = backgroundSelection
    ? backgroundMap.get(backgroundSelection) ?? null
    : null
  const hasCustomBackground = Boolean(backgroundSelection && !backgroundMap.has(backgroundSelection))
  const equippedSlotsCount = editingMember
    ? equipmentSlotKeys.reduce((count, slot) => count + (editingMember.equipment?.[slot] ? 1 : 0), 0)
    : 0
  const highlightedSpells = editingMember?.spells.slice(0, 3) ?? []
  const remainingSpellCount = Math.max((editingMember?.spells.length ?? 0) - highlightedSpells.length, 0)

  const isDirty = useMemo(() => {
    if (!editingMember || editingBaseline == null) {
      return false
    }
    return createMemberEditSignature(editingMember) !== editingBaseline
  }, [editingBaseline, editingMember])

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  useEffect(() => {
    if (!members.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !members.some((member) => member.id === selectedId)) {
      setSelectedId(members[0].id)
    }
  }, [members, selectedId])

  useEffect(() => {
    if (!editingMember || !editingBuild) {
      previousBuildSignatureRef.current = null
      return
    }

    if (!buildSkillSignature) {
      previousBuildSignatureRef.current = null
      return
    }

    if (previousBuildSignatureRef.current === buildSkillSignature) {
      return
    }

    previousBuildSignatureRef.current = buildSkillSignature

    if (!recommendedSkills.length) {
      return
    }

    setEditingMember((state) => {
      if (!state || state.id !== editingMember.id) {
        return state
      }
      const skillSet = new Set(state.skills)
      let changed = false
      const nextSkills = [...state.skills]
      for (const skill of recommendedSkills) {
        if (!skillSet.has(skill)) {
          skillSet.add(skill)
          nextSkills.push(skill)
          changed = true
        }
      }
      if (!changed) {
        return state
      }
      nextSkills.sort((a, b) => a.localeCompare(b, 'fr'))
      return { ...state, skills: nextSkills }
    })
  }, [buildSkillSignature, editingBuild, editingMember, recommendedSkills, setEditingMember])

  useEffect(() => {
    if (!editingMember || !recommendedSubclass) {
      return
    }
    const current = editingMember.subclass?.trim()
    if (current) {
      return
    }
    setEditingMember((state) => {
      if (!state || state.id !== editingMember.id) {
        return state
      }
      return { ...state, subclass: recommendedSubclass }
    })
  }, [editingMember, recommendedSubclass, setEditingMember])

  const buildAlignment = useMemo(() => {
    if (!editingMember || !editingBuild) {
      return null
    }

    const recommendedSpells = buildSpellTargets?.known ?? []
    const recommendedSpellSet = new Set(recommendedSpells)
    const removalSet = new Set(buildSpellTargets?.removed ?? [])
    const missingSpells = recommendedSpells.filter((spell) => !editingMember.spells.includes(spell))
    const spellsToRemove = [...removalSet]
      .filter((spell) => editingMember.spells.includes(spell))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    const extraSpells = editingMember.spells
      .filter((spell) => !recommendedSpellSet.has(spell) && !removalSet.has(spell))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    const skillMissing = recommendedSkills
      .filter((skill) => !editingMember.skills.includes(skill))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    const skillExtra = editingMember.skills
      .filter((skill) => !recommendedSkillsSet.has(skill))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    const recommendedClass = editingBuild.class_name?.trim() ?? null
    const currentClass = editingMember.class_name?.trim() ?? null
    const classDiffers = Boolean(recommendedClass && recommendedClass !== currentClass)
    const normalizedRecommendedSubclass = recommendedSubclass?.trim() ?? null
    const currentSubclass = editingMember.subclass?.trim() ?? null
    const subclassDiffers = Boolean(
      normalizedRecommendedSubclass && normalizedRecommendedSubclass !== currentSubclass,
    )
    const equipmentDiffs = equipmentSlotOrder
      .map((slot) => {
        const recommendedValue = recommendedEquipment[slot]
        if (!recommendedValue) {
          return null
        }
        const currentValue = editingMember.equipment?.[slot] ?? ''
        if (currentValue === recommendedValue) {
          return null
        }
        return {
          slot,
          label: equipmentSlotLabels[slot],
          recommended: recommendedValue,
          current: currentValue || null,
        }
      })
      .filter(
        (
          entry,
        ): entry is {
          slot: EquipmentSlotKey
          label: string
          recommended: string
          current: string | null
        } => entry != null,
      )
    const hasEquipmentRecommendations = equipmentSlotOrder.some((slot) =>
      Boolean(recommendedEquipment[slot]),
    )
    const hasSpellGuidance = recommendedSpells.length > 0 || removalSet.size > 0
    const hasSkillGuidance = recommendedSkills.length > 0
    const hasDifferences =
      missingSpells.length > 0 ||
      spellsToRemove.length > 0 ||
      extraSpells.length > 0 ||
      skillMissing.length > 0 ||
      skillExtra.length > 0 ||
      classDiffers ||
      subclassDiffers ||
      equipmentDiffs.length > 0

    return {
      recommendedClass,
      currentClass,
      classDiffers,
      recommendedSubclass: normalizedRecommendedSubclass,
      currentSubclass,
      subclassDiffers,
      missingSpells,
      spellsToRemove,
      extraSpells,
      recommendedSpells,
      skillMissing,
      skillExtra,
      equipmentDiffs,
      hasDifferences,
      hasSpellGuidance,
      hasSkillGuidance,
      hasEquipmentRecommendations,
    }
  }, [
    buildSpellTargets,
    editingBuild,
    editingMember,
    recommendedEquipment,
    recommendedSkills,
    recommendedSkillsSet,
    recommendedSubclass,
  ])

  function resetEditorState() {
    setEditingMember(null)
    setEditingBaseline(null)
    setSpellQuery('')
    setFormErrors({})
  }

  function confirmDiscardChanges(actionLabel: string): boolean {
    if (!isDirty) {
      return true
    }

    return window.confirm(
      `Vous avez des modifications non enregistrees. Voulez-vous les abandonner pour ${actionLabel} ?`,
    )
  }

  function beginEditing(member: PartyMember) {
    const editableMember = sanitizeMember(member as PartyMemberInput)
    const nextEditingMember: PartyMember = {
      ...editableMember,
      abilityScores: { ...editableMember.abilityScores },
      spells: [...editableMember.spells],
      skills: [...editableMember.skills],
      equipment: { ...(editableMember.equipment ?? {}) },
    }

    setEditingMember(nextEditingMember)
    setEditingBaseline(createMemberEditSignature(nextEditingMember))
    setSelectedId(editableMember.id)
    setSpellQuery('')
    setFormErrors({})
    setPlannerMessage(null)
  }

  function validateDraft(member: PartyMember): { name?: string; level?: string } {
    const errors: { name?: string; level?: string } = {}

    if (!member.name.trim()) {
      errors.name = 'Le nom du compagnon est obligatoire.'
    }

    if (!Number.isInteger(member.level) || member.level < 1 || member.level > 12) {
      errors.level = 'Le niveau doit etre un entier entre 1 et 12.'
    }

    return errors
  }

  function handleSelectMember(id: string) {
    if (selectedId === id) {
      return
    }

    if (editingMember && editingMember.id !== id && !confirmDiscardChanges('changer de membre')) {
      return
    }

    setSelectedId(id)
    if (editingMember && editingMember.id !== id) {
      resetEditorState()
      setPlannerMessage({ type: 'info', text: 'Edition abandonnee lors du changement de membre.' })
    }
  }

  function startCreate() {
    if (!confirmDiscardChanges('creer un nouveau membre')) {
      return
    }

    beginEditing(createEmptyMember())
  }

  function startEdit(member: PartyMember) {
    if (editingMember && editingMember.id !== member.id && !confirmDiscardChanges('modifier un autre membre')) {
      return
    }

    beginEditing(member)
  }

  function cancelEdit() {
    if (!confirmDiscardChanges("annuler l'edition")) {
      return
    }

    resetEditorState()
    setPlannerMessage({ type: 'info', text: 'Edition annulee.' })
  }

  function saveMember(member: PartyMember) {
    const sanitized = sanitizeMember(member as PartyMemberInput)

    setMembers((current) => {
      const exists = current.some((item) => item.id === sanitized.id)
      if (exists) {
        return current.map((item) => (item.id === sanitized.id ? sanitized : item))
      }
      return [...current, sanitized]
    })

    resetEditorState()
    setPlannerMessage({ type: 'success', text: 'Compagnon enregistre.' })
  }

  function removeMember(id: string) {
    const removingEditedMember = editingMember?.id === id
    if (removingEditedMember && !confirmDiscardChanges('retirer ce compagnon')) {
      return
    }

    setMembers((current) => current.filter((member) => member.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }

    if (removingEditedMember) {
      resetEditorState()
    }

    setPlannerMessage({ type: 'info', text: "Compagnon retire de l'equipe." })
  }

  function applyBuildRecommendations() {
    if (!editingMember || !editingBuild) {
      return
    }

    const targetSpells = buildSpellTargets?.known ?? []
    const skills = recommendedSkills
    const recommendedClass = editingBuild.class_name?.trim() ?? null
    const subclassChoice = recommendedSubclass?.trim() ?? null

    setEditingMember((state) => {
      if (!state || state.id !== editingMember.id) {
        return state
      }

      const baseEquipment = state.equipment ? { ...state.equipment } : {}
      let equipmentChanged = false
      for (const slot of equipmentSlotKeys) {
        const recommendedValue = recommendedEquipment[slot]
        if (recommendedValue && baseEquipment[slot] !== recommendedValue) {
          baseEquipment[slot] = recommendedValue
          equipmentChanged = true
        }
      }

      return {
        ...state,
        class_name: recommendedClass ?? state.class_name,
        subclass: subclassChoice ?? state.subclass,
        skills: skills.length ? skills : state.skills,
        spells: targetSpells.length ? targetSpells : state.spells,
        equipment: equipmentChanged ? baseEquipment : state.equipment,
      }
    })

    setPlannerMessage({ type: 'info', text: 'Recommandations du build appliquees au brouillon.' })
  }

  function handleEquipmentChange(slot: EquipmentSlotKey, value: string) {
    if (!editingMember) return
    const next: PartyEquipment = { ...(editingMember.equipment ?? {}) }
    const trimmed = value.trim()
    if (trimmed) {
      next[slot] = trimmed
    } else {
      delete next[slot]
    }
    setEditingMember({
      ...editingMember,
      equipment: next,
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
    downloadJSON(createVersionedPartyExport(members), 'bg3-party-members.json')
    setPlannerMessage({ type: 'success', text: 'Equipe exportee en JSON versionne.' })
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    if (editingMember && !confirmDiscardChanges('importer une equipe')) {
      input.value = ''
      return
    }

    try {
      const data = await readJSONFile<unknown>(file)
      const parsedMembers = parseImportedMembers(data)

      if (!parsedMembers) {
        setPlannerMessage({
          type: 'error',
          text: 'Import impossible: le fichier ne correspond pas au format attendu.',
        })
        return
      }

      setMembers(parsedMembers)
      setSelectedId(parsedMembers[0]?.id ?? null)
      resetEditorState()
      setPlannerMessage({
        type: 'success',
        text: `${parsedMembers.length} compagnon(s) importe(s) avec succes.`,
      })
    } catch (error) {
      console.error('Failed to import party members', error)
      setPlannerMessage({
        type: 'error',
        text: "Impossible d'importer les membres. Verifiez le fichier JSON.",
      })
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

    const normalizedDraft: PartyMember = {
      ...editingMember,
      name: editingMember.name.trim(),
      level: Math.max(1, Math.min(12, editingMember.level)),
    }
    const validation = validateDraft(normalizedDraft)

    setFormErrors(validation)

    if (validation.name || validation.level) {
      setPlannerMessage({
        type: 'error',
        text: 'Certaines informations sont invalides. Corrigez les champs signales.',
      })
      return
    }

    saveMember(normalizedDraft)
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
        {plannerMessage ? (
          <p className={`party-planner__message party-planner__message--${plannerMessage.type}`}>{plannerMessage.text}</p>
        ) : null}
        <div className="party-planner__layout">
          <div className="party-planner__roster">
            <ul>
              {members.map((member) => (
                <li key={member.id} className={member.id === selectedId ? 'active' : ''}>
                  <button className="link" onClick={() => handleSelectMember(member.id)}>
                    <span className="party-planner__name">{member.name || 'Compagnon sans nom'}</span>{' '}
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
                      onChange={(event) => {
                        setEditingMember({ ...editingMember, name: event.target.value })
                        if (formErrors.name) {
                          setFormErrors((current) => ({ ...current, name: undefined }))
                        }
                      }}
                      className={formErrors.name ? 'party-form__input party-form__input--error' : 'party-form__input'}
                      required
                    />
                    {formErrors.name ? <span className="party-form__error">{formErrors.name}</span> : null}
                  </label>
                  <label>
                    Niveau
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={editingMember.level}
                      onChange={(event) => {
                        const parsedLevel = Number.parseInt(event.target.value, 10)
                        setEditingMember({
                          ...editingMember,
                          level: Number.isFinite(parsedLevel) ? parsedLevel : 1,
                        })
                        if (formErrors.level) {
                          setFormErrors((current) => ({ ...current, level: undefined }))
                        }
                      }}
                      className={formErrors.level ? 'party-form__input party-form__input--error' : 'party-form__input'}
                    />
                    {formErrors.level ? <span className="party-form__error">{formErrors.level}</span> : null}
                  </label>
                  <label>
                    Acte
                    <select
                      value={editingMember.act ?? ''}
                      onChange={(event) =>
                        setEditingMember({
                          ...editingMember,
                          act: event.target.value ? event.target.value : undefined,
                        })
                      }
                    >
                      <option value="">--</option>
                      {PARTY_ACT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Rôle
                    <select
                      value={editingMember.role ?? ''}
                      onChange={(event) =>
                        setEditingMember({
                          ...editingMember,
                          role: event.target.value ? event.target.value : undefined,
                        })
                      }
                    >
                      <option value="">--</option>
                      {PARTY_ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
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
                      <option value="">--</option>
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
                      <option value="">--</option>
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
                      <option value="">--</option>
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
                      <option value="">--</option>
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
                      <option value="">--</option>
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
                  <select
                    value={editingMember.background ?? ''}
                    onChange={(event) =>
                      setEditingMember({
                        ...editingMember,
                        background: event.target.value || undefined,
                      })
                    }
                  >
                      <option value="">--</option>
                    {backgroundOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    {hasCustomBackground ? (
                      <option value={backgroundSelection}>{backgroundSelection}</option>
                    ) : null}
                  </select>
                </label>
                {selectedBackgroundInfo ? (
                  <div className="party-form__background-details">
                    {selectedBackgroundInfo.description ? (
                      <p>{selectedBackgroundInfo.description}</p>
                    ) : null}
                    {selectedBackgroundInfo.skills.length ? (
                      <p>
                        <strong>Compétences :</strong>{' '}
                        {selectedBackgroundInfo.skills.join(', ')}
                      </p>
                    ) : null}
                    {selectedBackgroundInfo.characters.length ? (
                      <p>
                        <strong>PNJ associés :</strong>{' '}
                        {selectedBackgroundInfo.characters.join(', ')}
                      </p>
                    ) : null}
                    {selectedBackgroundInfo.notes.length ? (
                      <ul>
                        {selectedBackgroundInfo.notes.map((note, index) => (
                          <li key={`${selectedBackgroundInfo.name}-note-${index}`}>{note}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

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
                    <h4>Compétences</h4>
                    <div className="toggle-grid">
                      {skillOptions.map((skill) => {
                        const isRecommended = recommendedSkillsSet.has(skill)
                        const labelClassName = isRecommended
                          ? 'toggle-grid__option toggle-grid__option--recommended'
                          : 'toggle-grid__option'
                        return (
                          <label key={skill} className={labelClassName}>
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
                        )
                      })}
                    </div>
                  </div>
                </div>

                {editingBuild ? (
                  <section className="party-form__build-check">
                    <div className="party-form__build-check-header">
                      <h4>Alignement avec {editingBuild.name}</h4>
                      <button
                        type="button"
                        className="party-form__build-check-apply"
                        onClick={applyBuildRecommendations}
                      >
                        Appliquer le build
                      </button>
                    </div>
                    {buildAlignment ? (
                      buildAlignment.hasDifferences ? (
                        <ul className="party-form__build-check-list">
                          {buildAlignment.recommendedClass ? (
                            <li>
                              <strong>Classe :</strong>{' '}
                              {buildAlignment.classDiffers ? (
                                <>
                                  <span className="party-form__build-check-warning">
                                    {buildAlignment.recommendedClass}
                                  </span>{' '}
                                  <span className="party-form__build-check-note">
                                    Actuel : {buildAlignment.currentClass || 'Aucun'}
                                  </span>
                                </>
                              ) : (
                                <span>Alignée avec le build.</span>
                              )}
                            </li>
                          ) : null}
                          {buildAlignment.recommendedSubclass ? (
                            <li>
                              <strong>Spécialisation :</strong>{' '}
                              {buildAlignment.subclassDiffers ? (
                                <>
                                  <span className="party-form__build-check-warning">
                                    {buildAlignment.recommendedSubclass}
                                  </span>{' '}
                                  <span className="party-form__build-check-note">
                                    Actuelle : {buildAlignment.currentSubclass || 'Aucune'}
                                  </span>
                                </>
                              ) : (
                                <span>Alignée avec le build.</span>
                              )}
                            </li>
                          ) : null}
                          {buildAlignment.hasSkillGuidance ? (
                            <li>
                              <strong>Compétences :</strong>{' '}
                              {buildAlignment.skillMissing.length || buildAlignment.skillExtra.length ? (
                                <ul>
                                  {buildAlignment.skillMissing.length ? (
                                    <li>
                                      <span className="party-form__build-check-warning">A ajouter :</span>{' '}
                                      {buildAlignment.skillMissing.join(', ')}
                                    </li>
                                  ) : null}
                                  {buildAlignment.skillExtra.length ? (
                                    <li>
                                      <span className="party-form__build-check-warning">A retirer :</span>{' '}
                                      {buildAlignment.skillExtra.join(', ')}
                                    </li>
                                  ) : null}
                                </ul>
                              ) : (
                                <span>Alignées avec le build.</span>
                              )}
                            </li>
                          ) : null}
                          {buildAlignment.hasSpellGuidance ? (
                            <li>
                              <strong>Sorts :</strong>{' '}
                              {buildAlignment.missingSpells.length ||
                              buildAlignment.spellsToRemove.length ||
                              buildAlignment.extraSpells.length ? (
                                <ul>
                                  {buildAlignment.missingSpells.length ? (
                                    <li>
                                      <span className="party-form__build-check-warning">A apprendre :</span>{' '}
                                      {buildAlignment.missingSpells.join(', ')}
                                    </li>
                                  ) : null}
                                  {buildAlignment.spellsToRemove.length ? (
                                    <li>
                                      <span className="party-form__build-check-warning">A retirer :</span>{' '}
                                      {buildAlignment.spellsToRemove.join(', ')}
                                    </li>
                                  ) : null}
                                  {buildAlignment.extraSpells.length ? (
                                    <li>
                                      <span className="party-form__build-check-warning">Hors plan :</span>{' '}
                                      {buildAlignment.extraSpells.join(', ')}
                                    </li>
                                  ) : null}
                                </ul>
                              ) : (
                                <span>Alignés avec le build.</span>
                              )}
                            </li>
                          ) : null}
                          {buildAlignment.hasEquipmentRecommendations ? (
                            <li>
                              <strong>Equipement :</strong>{' '}
                              {buildAlignment.equipmentDiffs.length ? (
                                <ul>
                                  {buildAlignment.equipmentDiffs.map((entry) => (
                                    <li key={entry.slot}>
                                      {entry.label}{' -> '}{entry.recommended}
                                      <span className="party-form__build-check-note">
                                        {' '}
                                        (actuel : {entry.current ?? 'non équipé'})
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span>Aligné avec les recommandations.</span>
                              )}
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="party-form__build-check-success">
                          Tout est aligné avec le plan pour le niveau actuel.
                        </p>
                      )
                    ) : (
                      <p className="party-form__build-check-success">
                        Sélectionnez un compagnon pour consulter le détail du build.
                      </p>
                    )}
                  </section>
                ) : null}

                <section className="equipment-editor">
                  <h4>Equipement</h4>
                  <div className="equipment-layout equipment-layout--editor">
                    <div className="equipment-layout__character equipment-layout__character--summary">
                      <strong>{editingMember.name.trim() || 'Compagnon en cours'}</strong>
                      <span>{editingMember.class_name ?? 'Classe non definie'} - Niv. {editingMember.level}</span>
                      <span>{editingMember.race ?? 'Race non definie'}</span>
                      <span>{equippedSlotsCount} emplacement(s) equipe(s)</span>
                      <span>
                        Sorts: {highlightedSpells.length ? highlightedSpells.join(', ') : 'aucun'}
                        {remainingSpellCount > 0 ? ` (+${remainingSpellCount})` : ''}
                      </span>
                    </div>
                    {equipmentSlotOrder.map((slot) => (
                      <label key={slot} className={`equipment-slot equipment-slot--${slot}`}>
                        <span className="equipment-slot__label">{equipmentSlotLabels[slot]}</span>
                        <select
                          value={editingMember.equipment?.[slot] ?? ''}
                          onChange={(event) => handleEquipmentChange(slot, event.target.value)}
                        >
                          <option value="">--</option>
                          {equipmentOptions[slot].map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>

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
                      {filteredSpells.map((spell) => {
                        const levelLabel = getSpellLevelShortLabel(spell.level)
                        return (
                          <li key={spell.name}>
                            <button type="button" onClick={() => addSpellToForm(spell.name)}>
                              {spell.name}
                            </button>
                            {levelLabel ? <span>{levelLabel}</span> : null}
                          </li>
                        )
                      })}
                    </ul>
                    <ul className="tag-list">
                      {editingMember.spells.map((spell) => (
                        <li key={spell}>
                          {spell}
                          <button type="button" onClick={() => removeSpell(spell)}>
                            x
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

      <PartyOverviewPanel
        members={members}
        spells={spells}
        equipment={equipment}
        skillsCatalog={skillOptions}
        roleOptions={Array.from(PARTY_ROLE_OPTIONS)}
        actOptions={Array.from(PARTY_ACT_OPTIONS)}
        metrics={partyMetrics}
      />

      <CharacterSheet
        member={selectedMember}
        build={selectedBuild}
        raceInfo={selectedRaceInfo}
        classInfo={selectedClassInfo}
        spells={spells}
        equipmentData={equipment}
      />
    </div>
  )
}



