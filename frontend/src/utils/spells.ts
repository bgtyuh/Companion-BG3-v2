import type { Spell } from '../types'

export interface SpellLevelInfo {
  value: string
  label: string
  shortLabel: string
}

const CANTRIP_REGEX = /^cantrips?$/i
const DIGIT_REGEX = /([0-9]+)/

export function getSpellLevelInfo(level?: string | null): SpellLevelInfo | null {
  if (!level) return null
  const trimmed = level.trim()
  if (!trimmed) return null
  if (CANTRIP_REGEX.test(trimmed)) {
    return {
      value: '0',
      label: 'Cantrips',
      shortLabel: 'Cantrip',
    }
  }
  const match = trimmed.match(DIGIT_REGEX)
  if (match) {
    const numeric = match[1]
    return {
      value: numeric,
      label: `Niveau ${numeric}`,
      shortLabel: `Niv. ${numeric}`,
    }
  }
  const fallback = trimmed
  return {
    value: fallback.toLowerCase(),
    label: fallback,
    shortLabel: fallback,
  }
}

export function getNormalizedSpellLevel(level?: string | null): string | null {
  const info = getSpellLevelInfo(level)
  return info?.value ?? null
}

export function getSpellLevelLabel(level?: string | null): string | null {
  const info = getSpellLevelInfo(level)
  return info?.label ?? null
}

export function getSpellLevelShortLabel(level?: string | null): string | null {
  const info = getSpellLevelInfo(level)
  return info?.shortLabel ?? null
}

export function sortSpellsByLevel(spellA: Spell, spellB: Spell): number {
  const levelA = Number.parseInt(getNormalizedSpellLevel(spellA.level) ?? '99', 10)
  const levelB = Number.parseInt(getNormalizedSpellLevel(spellB.level) ?? '99', 10)
  return levelA - levelB || spellA.name.localeCompare(spellB.name, 'fr')
}
