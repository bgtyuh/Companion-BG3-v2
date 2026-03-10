import assert from 'node:assert/strict'
import {
  PARTY_EXPORT_VERSION,
  createVersionedPartyExport,
  extractImportedMemberEntries,
} from '../src/utils/partyImport.ts'
import {
  computeBuildKnownSpells,
  createEmptyBuildSpellPlan,
  parseBuildSpellPlan,
  serializeBuildSpellPlan,
  type BuildSpellPlan,
} from '../src/utils/spells.ts'
import { computePartyMetrics } from '../src/utils/party.ts'
import type { BuildLevel, EquipmentCollections, PartyMember, Spell, WeaponItem } from '../src/types.ts'

let checks = 0

function expectEqual<T>(actual: T, expected: T, message: string): void {
  checks += 1
  assert.equal(actual, expected, message)
}

function expectDeepEqual<T>(actual: T, expected: T, message: string): void {
  checks += 1
  assert.deepEqual(actual, expected, message)
}

function createMember(id: string): PartyMember {
  return {
    id,
    name: `Member ${id}`,
    level: 5,
    abilityScores: {
      Strength: 10,
      Dexterity: 12,
      Constitution: 14,
      Intelligence: 8,
      Wisdom: 10,
      Charisma: 13,
    },
    skills: ['Perception'],
    equipment: {},
    spells: ['Magic Missile'],
  }
}

// partyImport tests
const exportMembers = [createMember('a'), createMember('b')]
const exported = createVersionedPartyExport(exportMembers)
expectEqual(exported.version, PARTY_EXPORT_VERSION, 'Versioned export should include current export version')
expectDeepEqual(exported.members, exportMembers, 'Versioned export should preserve members array')

const legacyPayload = [createMember('legacy')]
expectDeepEqual(
  extractImportedMemberEntries(legacyPayload),
  legacyPayload,
  'Legacy array payload should still import',
)

const versionedPayload = { version: 1, members: [createMember('v1')] }
expectDeepEqual(
  extractImportedMemberEntries(versionedPayload),
  versionedPayload.members,
  'Versioned payload should import members',
)
expectEqual(extractImportedMemberEntries(null), null, 'Null payload must be rejected')
expectEqual(extractImportedMemberEntries({ version: 1 }), null, 'Payload missing members must be rejected')
expectEqual(extractImportedMemberEntries({ members: 'bad' }), null, 'Non-array members must be rejected')

// spells tests
expectDeepEqual(
  parseBuildSpellPlan('Prioriser les sorts de controle'),
  createEmptyBuildSpellPlan('Prioriser les sorts de controle'),
  'Plain text spell plans should be treated as legacy summary',
)

const spellPlan: BuildSpellPlan = {
  summary: 'Niveau clef',
  learned: ['Magic Missile', 'Shield'],
  replacements: [{ previous: 'Sleep', next: 'Counterspell' }],
}
expectDeepEqual(
  parseBuildSpellPlan(serializeBuildSpellPlan(spellPlan)),
  spellPlan,
  'Structured spell plans should round-trip through serialize/parse',
)

const levels: BuildLevel[] = [
  {
    level: 1,
    spells: serializeBuildSpellPlan({
      summary: '',
      learned: ['Fire Bolt', 'Magic Missile'],
      replacements: [],
    }),
  },
  {
    level: 2,
    spells: serializeBuildSpellPlan({
      summary: '',
      learned: ['Mage Armour'],
      replacements: [{ previous: 'Fire Bolt', next: 'Scorching Ray' }],
    }),
  },
  {
    level: 3,
    spells: serializeBuildSpellPlan({
      summary: '',
      learned: ['Counterspell'],
      replacements: [{ previous: 'Unknown', next: 'Haste' }],
    }),
  },
]

const upToLevelTwo = computeBuildKnownSpells(levels, 2)
const upToLevelThree = computeBuildKnownSpells(levels, 3)
expectDeepEqual(
  upToLevelTwo.known,
  ['Mage Armour', 'Magic Missile', 'Scorching Ray'],
  'Known spells should reflect replacements up to requested level',
)
expectDeepEqual(upToLevelTwo.removed, ['Fire Bolt'], 'Removed spells should include replaced spells')
expectDeepEqual(
  upToLevelTwo.added,
  ['Fire Bolt', 'Mage Armour', 'Magic Missile', 'Scorching Ray'],
  'Added spells should include learned and replacement targets',
)
expectDeepEqual(
  upToLevelThree.known,
  ['Counterspell', 'Haste', 'Mage Armour', 'Magic Missile', 'Scorching Ray'],
  'Known spells should include higher-level learned/replaced spells',
)
expectDeepEqual(
  upToLevelThree.removed,
  ['Fire Bolt', 'Unknown'],
  'Removed spells should track replacement sources even if previously unknown',
)

// party metrics tests
const weapons: WeaponItem[] = [
  {
    weapon_id: 'longsword-1',
    name: 'Longsword',
    damages: [{ damage_type: 'Slashing' }],
    actions: [],
    abilities: [],
    locations: [],
    notes: [],
  },
  {
    weapon_id: 'staff-1',
    name: 'Staff of Sparks',
    damages: [{ damage_type: 'Lightning' }],
    actions: [],
    abilities: [],
    locations: [],
    notes: [],
  },
]

const spellCatalog: Spell[] = [
  {
    name: 'Fire Bolt',
    level: 'Cantrip',
    properties: [{ name: 'Damage', value: 'Deals 1d10 Fire damage.' }],
  },
  {
    name: 'Ray of Frost',
    level: 'Cantrip',
    properties: [{ name: 'Damage', value: 'Deals 1d8 Cold damage.' }],
  },
]

const equipment: EquipmentCollections = {
  armours: [],
  weapons,
  shields: [],
  clothing: [],
  headwears: [],
  handwears: [],
  footwears: [],
  cloaks: [],
  rings: [],
  amulets: [],
}

const members: PartyMember[] = [
  {
    ...createMember('Astarion'),
    name: 'Astarion',
    class_name: 'Wizard',
    role: 'Avant-garde',
    level: 4,
    skills: ['Arcana', 'Perception'],
    spells: ['Fire Bolt'],
    equipment: { mainHand: 'Longsword' },
  },
  {
    ...createMember('Gale'),
    name: 'Gale',
    class_name: 'Wizard',
    role: 'Soutien',
    level: 6,
    skills: ['Arcana', 'Perception'],
    spells: ['Ray of Frost'],
    equipment: { mainHand: 'Staff of Sparks' },
  },
]

const metrics = computePartyMetrics({
  members,
  spells: spellCatalog,
  equipment,
  skillsCatalog: ['Arcana', 'Perception', 'Athletisme'],
  roleCatalog: ['Avant-garde', 'Soutien', 'Controle'],
})

expectEqual(metrics.totalMembers, 2, 'Party size should match members count')
expectEqual(metrics.averageLevel, 5, 'Average level should be computed with two decimals max')
expectDeepEqual(metrics.missingSkills, ['Athletisme'], 'Missing skills should include uncovered entries')
expectDeepEqual(metrics.alerts.duplicateClasses, ['Wizard'], 'Duplicate classes should be flagged')
expectDeepEqual(metrics.alerts.duplicateRoles, [], 'Distinct roles should not be flagged as duplicates')
expectDeepEqual(metrics.alerts.missingRoles, ['Controle'], 'Missing roles should be reported')
expectDeepEqual(metrics.damageTypes.spells, ['Cold', 'Fire'], 'Spell damage distribution should be extracted')
expectDeepEqual(
  metrics.damageTypes.equipment,
  ['Lightning', 'Slashing'],
  'Equipment damage distribution should be extracted',
)
expectDeepEqual(
  metrics.damageTypes.combined,
  ['Cold', 'Fire', 'Lightning', 'Slashing'],
  'Combined damage distribution should merge spell and equipment sources',
)

const emptyMetrics = computePartyMetrics({
  members: [],
  spells: spellCatalog,
  equipment,
  skillsCatalog: ['Arcana'],
  roleCatalog: ['Soutien'],
})
expectEqual(emptyMetrics.totalMembers, 0, 'Empty party should have 0 members')
expectEqual(emptyMetrics.averageLevel, 0, 'Empty party average level should be 0')
expectDeepEqual(emptyMetrics.alerts.missingSkills, ['Arcana'], 'Empty party should miss all skills')
expectDeepEqual(emptyMetrics.alerts.missingRoles, ['Soutien'], 'Empty party should miss all roles')

console.log(`Frontend utility checks passed (${checks} assertions).`)

