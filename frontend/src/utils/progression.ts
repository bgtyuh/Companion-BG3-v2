import type { ClassProgressionEntry } from '../types'

export const progressionFieldLabels: Array<{
  key: keyof ClassProgressionEntry
  label: string
  formatter?: (value: NonNullable<ClassProgressionEntry[keyof ClassProgressionEntry]>) => string
}> = [
  { key: 'proficiency_bonus', label: 'Bonus de maîtrise' },
  { key: 'rage_charges', label: 'Charges de rage' },
  { key: 'rage_damage', label: 'Bonus de dégâts (Rage)' },
  { key: 'cantrips_known', label: 'Tours de magie connus' },
  { key: 'spells_known', label: 'Sorts connus' },
  { key: 'spell_slots_1st', label: 'Emplacements de sorts (niv. 1)' },
  { key: 'spell_slots_2nd', label: 'Emplacements de sorts (niv. 2)' },
  { key: 'spell_slots_3rd', label: 'Emplacements de sorts (niv. 3)' },
  { key: 'spell_slots_4th', label: 'Emplacements de sorts (niv. 4)' },
  { key: 'spell_slots_5th', label: 'Emplacements de sorts (niv. 5)' },
  { key: 'spell_slots_6th', label: 'Emplacements de sorts (niv. 6)' },
  { key: 'sorcery_points', label: 'Points de sorcellerie' },
  { key: 'sneak_attack_damage', label: 'Attaque sournoise' },
  { key: 'bardic_inspiration_charges', label: 'Charges Inspiration bardique' },
  { key: 'channel_divinity_charges', label: 'Charges Canalisation divine' },
  { key: 'lay_on_hands_charges', label: 'Réserves d’imposition des mains' },
  { key: 'ki_points', label: 'Points de ki' },
  { key: 'unarmoured_movement_bonus', label: 'Bonus de déplacement (sans armure)' },
  { key: 'martial_arts_damage', label: 'Dégâts d’arts martiaux' },
  { key: 'spell_slots_per_level', label: 'Emplacements par niveau' },
  { key: 'invocations_known', label: 'Invocations connues' },
]

export function getProgressionHighlights(entry?: ClassProgressionEntry): Array<{ label: string; value: string }> {
  if (!entry) return []

  return progressionFieldLabels
    .map(({ key, label, formatter }) => {
      const value = entry[key]
      if (value == null) {
        return null
      }
      if (typeof value === 'number') {
        if (!Number.isFinite(value) || value <= 0) {
          return null
        }
        return { label, value: `${value}` }
      }
      const trimmed = `${value}`.trim()
      if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'none') {
        return null
      }
      return { label, value: formatter ? formatter(value) : trimmed }
    })
    .filter((entry): entry is { label: string; value: string } => entry != null)
}
