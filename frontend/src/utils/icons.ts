const trailingQualifierPattern = /(?:\s*(?:\([^)]*\)|\[[^\]]*\]))+$/g

function normalizeName(value: string) {
  return value
    .trim()
    .replace(trailingQualifierPattern, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const suffixTokens = ['icon', 'spell', 'melee', 'ranged', 'faded', 'badge']

const plusWordMap: Record<string, string> = {
  one: '+1',
  two: '+2',
  three: '+3',
  four: '+4',
  five: '+5',
  six: '+6',
  seven: '+7',
  eight: '+8',
  nine: '+9',
  ten: '+10',
}

function generateNameVariants(fileName: string) {
  const variants = new Set<string>()
  const queue = [fileName]

  while (queue.length) {
    const current = queue.pop()
    if (!current) continue
    if (variants.has(current)) continue

    variants.add(current)

    const decoded = safeDecode(current)
    if (decoded !== current) queue.push(decoded)

    const withoutPrefix = current.replace(/^\d+(?:px)?[-_]?/i, '')
    if (withoutPrefix !== current) queue.push(withoutPrefix)

    const withoutWebp = current.replace(/\.webp$/i, '')
    if (withoutWebp !== current) queue.push(withoutWebp)

    for (const token of suffixTokens) {
      const pattern = new RegExp(`(?:^|[-_])${token}(?:[-_]?[0-9]+)?$`, 'i')
      if (pattern.test(current)) {
        const trimmed: string = current.replace(pattern, '').replace(/[-_]+$/, '')
        if (trimmed && trimmed !== current) queue.push(trimmed)
      }
    }

    const plusConverted = current.replace(
      /Plus(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)/gi,
      (_, word: string) => ` ${plusWordMap[word.toLowerCase()] ?? ''}`.trimEnd(),
    )
    if (plusConverted !== current) queue.push(plusConverted)

    const prefixNumberMatch = current.match(/^(?:\+)?(\d+)[-_](.+)$/)
    if (prefixNumberMatch) {
      const [, number, rest] = prefixNumberMatch
      const reordered = `${rest} +${number}`
      if (reordered !== current) queue.push(reordered)
    }
  }

  return variants
}

function createIconMap(glob: Record<string, unknown>) {
  const map = new Map<string, string>()
  for (const [filePath, url] of Object.entries(glob)) {
    if (typeof url !== 'string') continue
    const segments = filePath.split('/')
    const fileWithExtension = segments[segments.length - 1] ?? filePath
    const fileName = fileWithExtension.replace(/\.[^/.]+$/, '')
    const variants = generateNameVariants(fileName)
    for (const variant of variants) {
      const key = normalizeName(variant)
      if (!key) continue
      if (!map.has(key)) {
        map.set(key, url)
      }
    }
  }
  return map
}

const weaponIcons = import.meta
  .glob('../../../ressources/icons/weapon_images/*.png', { eager: true, import: 'default' })
const armourIcons = import.meta
  .glob('../../../ressources/icons/armour_images/*.png', { eager: true, import: 'default' })
const shieldIcons = import.meta
  .glob('../../../ressources/icons/shield_images/*.png', { eager: true, import: 'default' })
const clothingIcons = import.meta
  .glob('../../../ressources/icons/clothing_images/*.png', { eager: true, import: 'default' })
const headwearIcons = import.meta
  .glob('../../../ressources/icons/headwear_images/*.png', { eager: true, import: 'default' })
const handwearIcons = import.meta
  .glob('../../../ressources/icons/handwear_images/*.png', { eager: true, import: 'default' })
const footwearIcons = import.meta
  .glob('../../../ressources/icons/footwear_images/*.png', { eager: true, import: 'default' })
const cloakIcons = import.meta
  .glob('../../../ressources/icons/cloak_images/*.png', { eager: true, import: 'default' })
const ringIcons = import.meta
  .glob('../../../ressources/icons/ring_images/*.png', { eager: true, import: 'default' })
const amuletIcons = import.meta
  .glob('../../../ressources/icons/amulet_images/*.png', { eager: true, import: 'default' })
const spellIcons = import.meta
  .glob('../../../ressources/icons/spell_images/*.png', { eager: true, import: 'default' })
const abilityIcons = import.meta
  .glob('../../../ressources/icons/ability_images/*.png', { eager: true, import: 'default' })
const classIcons = import.meta
  .glob('../../../ressources/icons/class_images/*.png', { eager: true, import: 'default' })
const raceIcons = import.meta
  .glob('../../../ressources/icons/race_images/*.png', { eager: true, import: 'default' })
const backgroundIcons = import.meta
  .glob('../../../ressources/icons/background_images/*.png', { eager: true, import: 'default' })

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
