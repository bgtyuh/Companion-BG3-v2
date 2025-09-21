import type {
  EquipmentCollections,
  PartyMember,
  Spell,
  SpellProperty,
  WeaponItem,
} from '../types'

export interface PartyMetricsDistributionEntry {
  name: string
  count: number
}

export interface PartyMetricsAlerts {
  missingSkills: string[]
  duplicateClasses: string[]
  duplicateRoles: string[]
  missingRoles: string[]
}

export interface PartyMetricsDamageBreakdown {
  spells: string[]
  equipment: string[]
  combined: string[]
}

export interface PartyMetrics {
  totalMembers: number
  averageLevel: number
  skillsCovered: string[]
  missingSkills: string[]
  classDistribution: PartyMetricsDistributionEntry[]
  roleDistribution: PartyMetricsDistributionEntry[]
  damageTypes: PartyMetricsDamageBreakdown
  alerts: PartyMetricsAlerts
}

export interface ComputePartyMetricsOptions {
  members: PartyMember[]
  spells: Spell[]
  equipment: EquipmentCollections
  skillsCatalog: string[]
  roleCatalog: string[]
}

export const PARTY_ACT_OPTIONS = ['Acte I', 'Acte II', 'Acte III', 'Épilogue'] as const

export const PARTY_ROLE_OPTIONS = [
  'Avant-garde',
  'Dégâts',
  'Soutien',
  'Contrôle',
  'Soigneur',
  'Polyvalent',
] as const

const DAMAGE_KEYWORDS = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
]

const DAMAGE_REGEX = new RegExp(`\\b(${DAMAGE_KEYWORDS.join('|')})\\b`, 'gi')

function normaliseLabel(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const trimmed = value.trim()
  return trimmed ? trimmed : fallback
}

function normaliseDamageType(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

function extractDamageTypesFromProperty(property: SpellProperty): string[] {
  if (!property.property_value) return []
  const matches = property.property_value.match(DAMAGE_REGEX)
  if (!matches) return []
  const found = new Set<string>()
  for (const match of matches) {
    const normalised = normaliseDamageType(match)
    if (normalised) {
      found.add(normalised)
    }
  }
  return [...found]
}

function extractDamageTypesFromSpell(spell: Spell): string[] {
  if (!spell.properties?.length) return []
  const damageTypes = new Set<string>()
  for (const property of spell.properties) {
    if (property.property_name && property.property_name.toLowerCase() === 'damage') {
      for (const type of extractDamageTypesFromProperty(property)) {
        damageTypes.add(type)
      }
    }
  }
  return [...damageTypes]
}

function extractDamageTypesFromWeapon(weapon: WeaponItem | undefined): string[] {
  if (!weapon?.damages?.length) return []
  const damageTypes = new Set<string>()
  for (const damage of weapon.damages) {
    const normalised = normaliseDamageType(damage.damage_type)
    if (normalised) {
      damageTypes.add(normalised)
    }
  }
  return [...damageTypes]
}

export function computePartyMetrics({
  members,
  spells,
  equipment,
  skillsCatalog,
  roleCatalog,
}: ComputePartyMetricsOptions): PartyMetrics {
  if (!members.length) {
    return {
      totalMembers: 0,
      averageLevel: 0,
      skillsCovered: [],
      missingSkills: [...skillsCatalog],
      classDistribution: [],
      roleDistribution: [],
      damageTypes: { spells: [], equipment: [], combined: [] },
      alerts: {
        missingSkills: [...skillsCatalog],
        duplicateClasses: [],
        duplicateRoles: [],
        missingRoles: [...roleCatalog],
      },
    }
  }

  const spellMap = new Map<string, Spell>()
  for (const spell of spells) {
    spellMap.set(spell.name, spell)
  }

  const weaponMap = new Map<string, WeaponItem>()
  for (const weapon of equipment.weapons) {
    weaponMap.set(weapon.name, weapon)
  }

  const skillSet = new Set<string>()
  const classCounts = new Map<string, number>()
  const roleCounts = new Map<string, number>()
  const spellDamageTypes = new Set<string>()
  const equipmentDamageTypes = new Set<string>()

  let levelTotal = 0

  for (const member of members) {
    levelTotal += member.level

    for (const skill of member.skills) {
      skillSet.add(skill)
    }

    const classLabel = normaliseLabel(member.class_name, 'Classe non assignée')
    classCounts.set(classLabel, (classCounts.get(classLabel) ?? 0) + 1)

    const roleLabel = normaliseLabel(member.role, 'Rôle non défini')
    roleCounts.set(roleLabel, (roleCounts.get(roleLabel) ?? 0) + 1)

    for (const spellName of member.spells) {
      const spell = spellMap.get(spellName)
      if (!spell) continue
      for (const type of extractDamageTypesFromSpell(spell)) {
        spellDamageTypes.add(type)
      }
    }

    const equipmentSelection = member.equipment ?? {}
    const weaponSlots: Array<'mainHand' | 'offHand' | 'ranged'> = ['mainHand', 'offHand', 'ranged']
    for (const slot of weaponSlots) {
      const weaponName = equipmentSelection[slot]
      if (!weaponName) continue
      const weapon = weaponMap.get(weaponName)
      if (!weapon) continue
      for (const type of extractDamageTypesFromWeapon(weapon)) {
        equipmentDamageTypes.add(type)
      }
    }
  }

  const totalMembers = members.length
  const averageLevel = totalMembers ? Number((levelTotal / totalMembers).toFixed(2)) : 0

  const skillsCovered = [...skillSet].sort((a, b) => a.localeCompare(b, 'fr'))
  const missingSkills = skillsCatalog.filter((skill) => !skillSet.has(skill))

  const classDistribution = [...classCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.name.localeCompare(b.name, 'fr')
      }
      return b.count - a.count
    })

  const roleDistribution = [...roleCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.name.localeCompare(b.name, 'fr')
      }
      return b.count - a.count
    })

  const damageTypes = {
    spells: [...spellDamageTypes].sort((a, b) => a.localeCompare(b, 'fr')),
    equipment: [...equipmentDamageTypes].sort((a, b) => a.localeCompare(b, 'fr')),
  }
  const combinedDamageTypes = new Set([...damageTypes.spells, ...damageTypes.equipment])

  const alerts: PartyMetricsAlerts = {
    missingSkills,
    duplicateClasses: classDistribution
      .filter((entry) => entry.count > 1 && entry.name !== 'Classe non assignée')
      .map((entry) => entry.name),
    duplicateRoles: roleDistribution
      .filter((entry) => entry.count > 1 && entry.name !== 'Rôle non défini')
      .map((entry) => entry.name),
    missingRoles: roleCatalog.filter((role) => (roleCounts.get(role) ?? 0) === 0),
  }

  return {
    totalMembers,
    averageLevel,
    skillsCovered,
    missingSkills,
    classDistribution,
    roleDistribution,
    damageTypes: {
      ...damageTypes,
      combined: [...combinedDamageTypes].sort((a, b) => a.localeCompare(b, 'fr')),
    },
    alerts,
  }
}
