function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function createIconMap(glob: Record<string, unknown>) {
  const map = new Map<string, string>()
  for (const [filePath, url] of Object.entries(glob)) {
    if (typeof url !== 'string') continue
    const segments = filePath.split('/')
    const fileWithExtension = segments[segments.length - 1] ?? filePath
    const fileName = fileWithExtension.replace(/\.[^/.]+$/, '')
    const key = normalizeName(fileName)
    if (!map.has(key)) {
      map.set(key, url)
    }
  }
  return map
}

const weaponIcons = import.meta
  .glob('../../ressources/icons/weapon_images/*.png', { eager: true, import: 'default' })
const armourIcons = import.meta
  .glob('../../ressources/icons/armour_images/*.png', { eager: true, import: 'default' })
const shieldIcons = import.meta
  .glob('../../ressources/icons/shield_images/*.png', { eager: true, import: 'default' })
const clothingIcons = import.meta
  .glob('../../ressources/icons/clothing_images/*.png', { eager: true, import: 'default' })
const headwearIcons = import.meta
  .glob('../../ressources/icons/headwear_images/*.png', { eager: true, import: 'default' })
const handwearIcons = import.meta
  .glob('../../ressources/icons/handwear_images/*.png', { eager: true, import: 'default' })
const footwearIcons = import.meta
  .glob('../../ressources/icons/footwear_images/*.png', { eager: true, import: 'default' })
const cloakIcons = import.meta
  .glob('../../ressources/icons/cloak_images/*.png', { eager: true, import: 'default' })
const ringIcons = import.meta
  .glob('../../ressources/icons/ring_images/*.png', { eager: true, import: 'default' })
const amuletIcons = import.meta
  .glob('../../ressources/icons/amulet_images/*.png', { eager: true, import: 'default' })
const spellIcons = import.meta
  .glob('../../ressources/icons/spell_images/*.png', { eager: true, import: 'default' })
const abilityIcons = import.meta
  .glob('../../ressources/icons/ability_images/*.png', { eager: true, import: 'default' })
const classIcons = import.meta
  .glob('../../ressources/icons/class_images/*.png', { eager: true, import: 'default' })
const raceIcons = import.meta
  .glob('../../ressources/icons/race_images/*.png', { eager: true, import: 'default' })
const backgroundIcons = import.meta
  .glob('../../ressources/icons/background_images/*.png', { eager: true, import: 'default' })

type IconCategory =
  | 'weapon'
  | 'armour'
  | 'shield'
  | 'clothing'
  | 'headwear'
  | 'handwear'
  | 'footwear'
  | 'cloak'
  | 'ring'
  | 'amulet'
  | 'spell'
  | 'ability'
  | 'class'
  | 'race'
  | 'background'

type IconMap = Record<IconCategory, Map<string, string>>

const iconMaps: IconMap = {
  weapon: createIconMap(weaponIcons),
  armour: createIconMap(armourIcons),
  shield: createIconMap(shieldIcons),
  clothing: createIconMap(clothingIcons),
  headwear: createIconMap(headwearIcons),
  handwear: createIconMap(handwearIcons),
  footwear: createIconMap(footwearIcons),
  cloak: createIconMap(cloakIcons),
  ring: createIconMap(ringIcons),
  amulet: createIconMap(amuletIcons),
  spell: createIconMap(spellIcons),
  ability: createIconMap(abilityIcons),
  class: createIconMap(classIcons),
  race: createIconMap(raceIcons),
  background: createIconMap(backgroundIcons),
}

export function getIconUrl(category: IconCategory, name: string | null | undefined) {
  if (!name) return null
  const normalized = normalizeName(name)
  const iconMap = iconMaps[category]
  return iconMap.get(normalized) ?? null
}

export { normalizeName }
export type { IconCategory }
