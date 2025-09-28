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
import { downloadJSON } from '../utils/file'
import { equipmentSlotLabels, equipmentSlotOrder } from '../utils/equipment'
import { computePartyMetrics, PARTY_ACT_OPTIONS, PARTY_ROLE_OPTIONS } from '../utils/party'
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
  savingThrows?: unknown
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
  if (Array.isArray(data)) {
    if (!data.every((item) => isValidPartyMember(item))) return null
    return data.map((member) => sanitizeMember(member as PartyMemberInput))
  }

  if (isValidPartyMember(data)) {
    return [sanitizeMember(data as PartyMemberInput)]
  }

  return null
}

interface PokemonShowdownEntry {
  name: string
  item?: string
  ability?: string
  teraType?: string
  nature?: string
  evs?: string
  level?: number
  moves: string[]
  extraNotes: string[]
}

function parsePokemonBlock(lines: string[]): PartyMember | null {
  if (!lines.length) return null

  const firstLineMatch = lines[0]?.match(/^(.*?)(?:\s*@\s*(.*))?$/)
  const name = firstLineMatch?.[1]?.trim()
  if (!name) {
    return null
  }

  const entry: PokemonShowdownEntry = {
    name,
    item: firstLineMatch?.[2]?.trim() || undefined,
    moves: [],
    extraNotes: [],
  }

  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim()
    if (!line) continue

    if (/^Ability:/i.test(line)) {
      entry.ability = line.replace(/^Ability:\s*/i, '').trim()
      continue
    }

    if (/^Tera Type:/i.test(line)) {
      entry.teraType = line.replace(/^Tera Type:\s*/i, '').trim()
      continue
    }

    if (/^EVs:/i.test(line)) {
      entry.evs = line.replace(/^EVs:\s*/i, '').trim()
      continue
    }

    if (/^IVs:/i.test(line)) {
      const ivs = line.replace(/^IVs:\s*/i, '').trim()
      if (ivs) {
        entry.extraNotes.push(`IVs : ${ivs}`)
      }
      continue
    }

    if (/^Level:/i.test(line)) {
      const levelText = line.replace(/^Level:\s*/i, '').trim()
      const parsedLevel = Number.parseInt(levelText, 10)
      if (Number.isFinite(parsedLevel)) {
        entry.level = parsedLevel
      } else if (levelText) {
        entry.extraNotes.push(`Niveau : ${levelText}`)
      }
      continue
    }

    if (/^Shiny:/i.test(line) || /^Gigantamax:/i.test(line) || /^Happiness:/i.test(line) || /^Friendship:/i.test(line)) {
      entry.extraNotes.push(line)
      continue
    }

    if (/^Nature:/i.test(line)) {
      const natureText = line.replace(/^Nature:\s*/i, '').trim()
      if (natureText) {
        entry.nature = natureText
      }
      continue
    }

    if (line.startsWith('-')) {
      const move = line.replace(/^-+\s*/, '').trim()
      if (move) {
        entry.moves.push(move)
      }
      continue
    }

    const natureMatch = line.match(/^([\w\s.'()-]+)\sNature$/i)
    if (natureMatch) {
      entry.nature = natureMatch[1]?.trim()
      continue
    }

    if (/^[A-Za-z]+:\s/.test(line)) {
      entry.extraNotes.push(line)
      continue
    }

    entry.extraNotes.push(line)
  }

  const baseMember = createEmptyMember()
  baseMember.name = entry.name
  baseMember.level = entry.level ?? 50
  baseMember.spells = entry.moves

  const notes: string[] = []
  if (entry.item) {
    notes.push(`Objet : ${entry.item}`)
  }
  if (entry.ability) {
    notes.push(`Talent : ${entry.ability}`)
  }
  if (entry.teraType) {
    notes.push(`Téra-type : ${entry.teraType}`)
  }
  if (entry.nature) {
    notes.push(`Nature : ${entry.nature}`)
  }
  if (entry.evs) {
    notes.push(`EVs : ${entry.evs}`)
  }
  notes.push(...entry.extraNotes)

  baseMember.notes = notes.join('\n')

  return sanitizeMember(baseMember as PartyMemberInput)
}

function parsePokemonShowdownTeam(content: string): PartyMember[] | null {
  const trimmed = content.trim()
  if (!trimmed) return null

  const rawBlocks = trimmed.split(/\r?\n\s*\r?\n/).map((block) => block.trim())
  const members: PartyMember[] = []

  for (const block of rawBlocks) {
    if (!block) continue
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const parsed = parsePokemonBlock(lines)
    if (parsed) {
      members.push(parsed)
    }
  }

  return members.length ? members : null
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

  function startCreate() {
    const member = createEmptyMember()
    setEditingMember(member)
    setSelectedId(member.id)
    setSpellQuery('')
  }

  function startEdit(member: PartyMember) {
    const editableMember = sanitizeMember(member as PartyMemberInput)
    setEditingMember({
      ...editableMember,
      abilityScores: { ...editableMember.abilityScores },
      spells: [...editableMember.spells],
      skills: [...editableMember.skills],
      equipment: { ...(editableMember.equipment ?? {}) },
    })
    setSelectedId(member.id)
    setSpellQuery('')
  }

  function cancelEdit() {
    setEditingMember(null)
    setSpellQuery('')
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
    setEditingMember(null)
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
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
    downloadJSON(members, 'bg3-party-members.json')
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    try {
      const textContent = await file.text()
      let importedMembers: PartyMember[] | null = null
      let importMode: 'append' | 'replace' = 'append'

      try {
        const data = JSON.parse(textContent) as unknown
        const parsed = parseImportedMembers(data)
        if (parsed) {
          importedMembers = parsed
          importMode = Array.isArray(data) ? 'replace' : 'append'
        }
      } catch {
        // Not a JSON payload – fall back to Showdown parsing
      }

      if (!importedMembers) {
        importedMembers = parsePokemonShowdownTeam(textContent)
        importMode = 'append'
      }

      if (!importedMembers) {
        window.alert('Le fichier ne correspond pas au format attendu (JSON ou import Pokémon).')
        return
      }

      if (importMode === 'replace') {
        setMembers(importedMembers)
        setSelectedId(importedMembers[0]?.id ?? null)
      } else {
        const appendedMembers = importedMembers.map((member) =>
          sanitizeMember({ ...(member as PartyMemberInput), id: crypto.randomUUID() } as PartyMemberInput),
        )
        setMembers((previousMembers) => [...previousMembers, ...appendedMembers])
        setSelectedId(appendedMembers[0]?.id ?? null)
      }

      setEditingMember(null)
      setSpellQuery('')
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
    saveMember(editingMember)
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
              accept=".json,.txt,application/json,text/plain"
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
                      <option value="">—</option>
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
                      <option value="">—</option>
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
                  <select
                    value={editingMember.background ?? ''}
                    onChange={(event) =>
                      setEditingMember({
                        ...editingMember,
                        background: event.target.value || undefined,
                      })
                    }
                  >
                    <option value="">—</option>
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
                                    Actuel : {buildAlignment.currentClass || '—'}
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
                                    Actuelle : {buildAlignment.currentSubclass || '—'}
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
                                      <span className="party-form__build-check-warning">À ajouter :</span>{' '}
                                      {buildAlignment.skillMissing.join(', ')}
                                    </li>
                                  ) : null}
                                  {buildAlignment.skillExtra.length ? (
                                    <li>
                                      <span className="party-form__build-check-warning">À retirer :</span>{' '}
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
                                      <span className="party-form__build-check-warning">À apprendre :</span>{' '}
                                      {buildAlignment.missingSpells.join(', ')}
                                    </li>
                                  ) : null}
                                  {buildAlignment.spellsToRemove.length ? (
                                    <li>
                                      <span className="party-form__build-check-warning">À retirer :</span>{' '}
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
                              <strong>Équipement :</strong>{' '}
                              {buildAlignment.equipmentDiffs.length ? (
                                <ul>
                                  {buildAlignment.equipmentDiffs.map((entry) => (
                                    <li key={entry.slot}>
                                      {entry.label} → {entry.recommended}
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
                  <h4>Équipement</h4>
                  <div className="equipment-layout equipment-layout--editor">
                    <div className="equipment-layout__character" aria-hidden="true">
                      <span>Portrait</span>
                      <span>en préparation</span>
                    </div>
                    {equipmentSlotOrder.map((slot) => (
                      <label key={slot} className={`equipment-slot equipment-slot--${slot}`}>
                        <span className="equipment-slot__label">{equipmentSlotLabels[slot]}</span>
                        <select
                          value={editingMember.equipment?.[slot] ?? ''}
                          onChange={(event) => handleEquipmentChange(slot, event.target.value)}
                        >
                          <option value="">—</option>
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
