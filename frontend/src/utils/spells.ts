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

export interface BuildSpellReplacement {
  previous: string
  next: string
}

export interface BuildSpellPlan {
  summary: string
  learned: string[]
  replacements: BuildSpellReplacement[]
}

function sanitizeSpellList(values: string[] | undefined): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values ?? []) {
    if (!value || typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }
  return result
}

function sanitizeReplacements(values: BuildSpellReplacement[] | undefined): BuildSpellReplacement[] {
  const result: BuildSpellReplacement[] = []
  for (const entry of values ?? []) {
    if (!entry || typeof entry !== 'object') continue
    const previous = typeof entry.previous === 'string' ? entry.previous.trim() : ''
    const next = typeof entry.next === 'string' ? entry.next.trim() : ''
    if (!previous && !next) {
      continue
    }
    result.push({ previous, next })
  }
  return result
}

export function createEmptyBuildSpellPlan(summary = ''): BuildSpellPlan {
  return {
    summary,
    learned: [],
    replacements: [],
  }
}

export function parseBuildSpellPlan(raw: string | null | undefined): BuildSpellPlan {
  if (!raw) {
    return createEmptyBuildSpellPlan()
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return createEmptyBuildSpellPlan()
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return createEmptyBuildSpellPlan(trimmed)
    }
    const summary = typeof (parsed as { summary?: unknown }).summary === 'string' ? (parsed as { summary: string }).summary : ''
    const learned = sanitizeSpellList((parsed as { learned?: unknown }).learned as string[] | undefined)
    const replacements = sanitizeReplacements((parsed as { replacements?: unknown }).replacements as BuildSpellReplacement[] | undefined)
    return {
      summary,
      learned,
      replacements,
    }
  } catch {
    // Legacy format stored as plain text.
    return createEmptyBuildSpellPlan(trimmed)
  }
}

export function serializeBuildSpellPlan(plan: BuildSpellPlan): string {
  const summary = plan.summary.trim()
  const learned = sanitizeSpellList(plan.learned)
  const replacements = sanitizeReplacements(plan.replacements)
  if (!learned.length && !replacements.length) {
    return summary
  }
  return JSON.stringify({ summary, learned, replacements })
}

export function describeBuildSpellPlan(plan: BuildSpellPlan): string {
  const summary = plan.summary.trim()
  const learned = sanitizeSpellList(plan.learned)
  const replacementDescriptions = sanitizeReplacements(plan.replacements).map((entry) => {
    if (entry.previous && entry.next) {
      return `${entry.previous} → ${entry.next}`
    }
    if (entry.next) {
      return `→ ${entry.next}`
    }
    return `${entry.previous} remplacé`
  })

  const parts: string[] = []
  if (learned.length) {
    parts.push(`Nouveaux : ${learned.join(', ')}`)
  }
  if (replacementDescriptions.length) {
    parts.push(`Remplacements : ${replacementDescriptions.join(', ')}`)
  }
  if (summary) {
    parts.push(summary)
  }
  return parts.join(' • ')
}
