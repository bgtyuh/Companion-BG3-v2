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

function normalizeIconPath(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const sanitized = trimmed
    .replace(/\\/g, '/')
    .replace(/^(\.{1,2}\/)+/, '')
    .replace(/^\/{1,}/, '')
    .replace(/\/{2,}/g, '/')

  if (!sanitized) return null

  const lower = sanitized.toLowerCase()
  const ressourcesNeedle = 'ressources/icons/'
  const iconsNeedle = 'icons/'

  let relative = sanitized
  const ressourcesIndex = lower.lastIndexOf(ressourcesNeedle)
  if (ressourcesIndex >= 0) {
    relative = sanitized.slice(ressourcesIndex + ressourcesNeedle.length)
  } else {
    const iconsIndex = lower.lastIndexOf(iconsNeedle)
    if (iconsIndex >= 0) {
      relative = sanitized.slice(iconsIndex + iconsNeedle.length)
    }
  }

  relative = relative.replace(/^\/{1,}/, '')
  if (!relative) return null

  return relative.toLowerCase()
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const percentEncodedPattern = /%[0-9a-f]{2}/i

function encodePathSegment(segment: string) {
  let result = ''
  let index = 0

  while (index < segment.length) {
    const char = segment[index]

    if (char === '%' && percentEncodedPattern.test(segment.slice(index, index + 3))) {
      result += segment.slice(index, index + 3).toLowerCase()
      index += 3
      continue
    }

    let nextIndex = index
    while (nextIndex < segment.length) {
      const nextChar = segment[nextIndex]
      if (
        nextChar === '%' &&
        percentEncodedPattern.test(segment.slice(nextIndex, nextIndex + 3))
      ) {
        break
      }
      nextIndex += 1
    }

    if (nextIndex > index) {
      const chunk = segment.slice(index, nextIndex)
      const encoded = encodeURIComponent(chunk)
        .replace(/[!'()*]/g, (value) => `%${value.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .toLowerCase()
      result += encoded
      index = nextIndex
    } else {
      const encoded = `%${segment.charCodeAt(index).toString(16).padStart(2, '0')}`.toLowerCase()
      result += encoded
      index += 1
    }
  }

  return result
}

function encodePath(value: string) {
  return value
    .split('/')
    .map((segment) => encodePathSegment(segment))
    .join('/')
}

function generatePathVariants(path: string) {
  const variants = new Set<string>()
  const queue = [path]

  while (queue.length) {
    const current = queue.pop()
    if (!current) continue
    if (variants.has(current)) continue

    variants.add(current)

    const encoded = encodePath(current)
    if (encoded !== current) {
      queue.push(encoded)
    }

    const decoded = safeDecode(current)
    if (decoded !== current) {
      queue.push(decoded.toLowerCase())
    }
  }

  return variants
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

interface IconLookup {
  byName: Map<string, string>
  byPath: Map<string, string>
}

function createIconLookup(glob: Record<string, unknown>): IconLookup {
  const byName = new Map<string, string>()
  const byPath = new Map<string, string>()
  for (const [filePath, url] of Object.entries(glob)) {
    if (typeof url !== 'string') continue

    const normalizedPath = normalizeIconPath(filePath)
    if (normalizedPath) {
      const pathVariants = generatePathVariants(normalizedPath)
      for (const variant of pathVariants) {
        if (!byPath.has(variant)) {
          byPath.set(variant, url)
        }
      }
    }

    const segments = filePath.split('/')
    const fileWithExtension = segments[segments.length - 1] ?? filePath
    const fileName = fileWithExtension.replace(/\.[^/.]+$/, '')
    const variants = generateNameVariants(fileName)
    for (const variant of variants) {
      const key = normalizeName(variant)
      if (!key) continue
      if (!byName.has(key)) {
        byName.set(key, url)
      }
    }
  }
  return { byName, byPath }
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

type IconMap = Record<IconCategory, IconLookup>

const iconMaps: IconMap = {
  weapon: createIconLookup(weaponIcons),
  armour: createIconLookup(armourIcons),
  shield: createIconLookup(shieldIcons),
  clothing: createIconLookup(clothingIcons),
  headwear: createIconLookup(headwearIcons),
  handwear: createIconLookup(handwearIcons),
  footwear: createIconLookup(footwearIcons),
  cloak: createIconLookup(cloakIcons),
  ring: createIconLookup(ringIcons),
  amulet: createIconLookup(amuletIcons),
  spell: createIconLookup(spellIcons),
}

const globalPathIndex = new Map<string, string>()
for (const lookup of Object.values(iconMaps)) {
  for (const [path, url] of lookup.byPath) {
    if (!globalPathIndex.has(path)) {
      globalPathIndex.set(path, url)
    }
  }
}

export function getIconUrl(
  category: IconCategory,
  name: string | null | undefined,
  imagePath?: string | null | undefined,
) {
  const lookup = iconMaps[category]
  if (!lookup) return null

  const normalizedPath = normalizeIconPath(imagePath)
  if (normalizedPath) {
    const pathMatch = lookup.byPath.get(normalizedPath) ?? globalPathIndex.get(normalizedPath)
    if (pathMatch) {
      return pathMatch
    }
  }

  if (!name) return null
  const normalized = normalizeName(name)
  return lookup.byName.get(normalized) ?? null
}

export { normalizeName }
export type { IconCategory }
