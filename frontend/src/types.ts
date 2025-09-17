export interface LootItem {
  id: number
  name: string
  type?: string | null
  region?: string | null
  description?: string | null
  is_collected: boolean
}

export interface BuildLevel {
  id?: number
  level: number
  spells?: string | null
  feats?: string | null
  subclass_choice?: string | null
  multiclass_choice?: string | null
  note?: string | null
}

export interface Build {
  id: number
  name: string
  race?: string | null
  class_name?: string | null
  subclass?: string | null
  notes?: string | null
  levels: BuildLevel[]
}

export interface Enemy {
  id: number
  name: string
  stats?: string | null
  resistances?: string | null
  weaknesses?: string | null
  abilities?: string | null
  notes?: string | null
}

export interface ArmourLocation {
  description: string
}

export interface ArmourSpecial {
  type: string
  name: string
  effect: string
}

export interface ArmourItem {
  item_id: string
  name: string
  description?: string | null
  quote?: string | null
  type?: string | null
  rarity?: string | null
  weight_kg?: number | null
  weight_lb?: number | null
  price_gp?: number | null
  image_path?: string | null
  armour_class_base?: number | null
  armour_class_modifier?: string | null
  locations: ArmourLocation[]
  specials: ArmourSpecial[]
}

export type AccessoryLocation = ArmourLocation
export type AccessorySpecial = ArmourSpecial

export interface AccessoryItemBase {
  item_id: string
  name: string
  description?: string | null
  quote?: string | null
  type?: string | null
  rarity?: string | null
  weight_kg?: number | null
  weight_lb?: number | null
  price_gp?: number | null
  image_path?: string | null
  locations: AccessoryLocation[]
  specials: AccessorySpecial[]
}

export type RingItem = AccessoryItemBase

export type AmuletItem = AccessoryItemBase

export type CloakItem = AccessoryItemBase

export type HandwearItem = AccessoryItemBase

export type HeadwearItem = AccessoryItemBase

export interface ClothingItem extends AccessoryItemBase {
  armour_class_base?: number | null
  armour_class_modifier?: string | null
}

export interface FootwearItem extends AccessoryItemBase {
  required_proficiency?: string | null
}

export interface ShieldItem extends AccessoryItemBase {
  shield_class_base?: number | null
}

export interface WeaponDamage {
  damage_dice?: string | null
  damage_bonus?: number | null
  damage_total_range?: string | null
  modifier?: string | null
  damage_type?: string | null
  damage_source?: string | null
}

export interface WeaponAction {
  name: string
  description?: string | null
}

export interface WeaponAbility {
  name: string
  description?: string | null
}

export interface WeaponLocation {
  description: string
}

export interface WeaponNote {
  content: string
}

export interface WeaponItem {
  weapon_id: string
  name: string
  rarity?: string | null
  description?: string | null
  quote?: string | null
  weight_kg?: number | null
  weight_lb?: number | null
  price?: number | null
  enchantment?: number | null
  type?: string | null
  range_m?: number | null
  range_f?: number | null
  attributes?: string | null
  image_path?: string | null
  damages: WeaponDamage[]
  actions: WeaponAction[]
  abilities: WeaponAbility[]
  locations: WeaponLocation[]
  notes: WeaponNote[]
}

export interface SpellProperty {
  name: string
  value: string
}

export interface Spell {
  name: string
  level?: string | null
  school?: string | null
  description?: string | null
  image_path?: string | null
  properties: SpellProperty[]
}

export interface SubraceFeature {
  name: string
  description?: string | null
}

export interface Subrace {
  name: string
  description?: string | null
  features: SubraceFeature[]
}

export interface RaceFeature {
  name: string
  description?: string | null
}

export interface Race {
  name: string
  description?: string | null
  base_speed?: string | null
  size?: string | null
  features: RaceFeature[]
  subraces: Subrace[]
}

export interface SubclassFeature {
  level: number
  feature_name: string
  feature_description?: string | null
}

export interface Subclass {
  name: string
  description?: string | null
  features: SubclassFeature[]
}

export interface ClassProgressionEntry {
  level: number
  proficiency_bonus?: string | null
  features?: string | null
  rage_charges?: number | null
  rage_damage?: number | null
  cantrips_known?: number | null
  spells_known?: number | null
  spell_slots_1st?: number | null
  spell_slots_2nd?: number | null
  spell_slots_3rd?: number | null
  spell_slots_4th?: number | null
  spell_slots_5th?: number | null
  spell_slots_6th?: number | null
  sorcery_points?: number | null
  sneak_attack_damage?: string | null
  bardic_inspiration_charges?: number | null
  channel_divinity_charges?: number | null
  lay_on_hands_charges?: number | null
  ki_points?: number | null
  unarmoured_movement_bonus?: string | null
  martial_arts_damage?: string | null
  spell_slots_per_level?: string | null
  invocations_known?: number | null
}

export interface CharacterClass {
  name: string
  description?: string | null
  hit_points_at_level1?: string | null
  hit_points_on_level_up?: string | null
  key_abilities?: string | null
  saving_throw_proficiencies?: string | null
  equipment_proficiencies?: string | null
  skill_proficiencies?: string | null
  spellcasting_ability?: string | null
  starting_equipment?: string | null
  subclasses: Subclass[]
  progression: ClassProgressionEntry[]
}

export type AbilityScoreKey =
  | 'Strength'
  | 'Dexterity'
  | 'Constitution'
  | 'Intelligence'
  | 'Wisdom'
  | 'Charisma'

export const equipmentSlotKeys = [
  'headwear',
  'amulet',
  'cloak',
  'armour',
  'handwear',
  'footwear',
  'ring1',
  'ring2',
  'clothing',
  'mainHand',
  'offHand',
  'ranged',
] as const

export type EquipmentSlotKey = (typeof equipmentSlotKeys)[number]

export type PartyEquipment = Partial<Record<EquipmentSlotKey, string>>

export interface EquipmentCollections {
  armours: ArmourItem[]
  weapons: WeaponItem[]
  shields: ShieldItem[]
  clothing: ClothingItem[]
  headwears: HeadwearItem[]
  handwears: HandwearItem[]
  footwears: FootwearItem[]
  cloaks: CloakItem[]
  rings: RingItem[]
  amulets: AmuletItem[]
}

export interface PartyMember {
  id: string
  name: string
  race?: string
  subrace?: string
  class_name?: string
  subclass?: string
  background?: string
  level: number
  buildId?: number
  abilityScores: Record<AbilityScoreKey, number>
  skills: string[]
  equipment?: PartyEquipment
  spells: string[]
  notes?: string
}
