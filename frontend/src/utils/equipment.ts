import type { EquipmentSlotKey } from '../types'

export const equipmentSlotLabels: Record<EquipmentSlotKey, string> = {
  headwear: 'Tête',
  amulet: 'Amulette',
  cloak: 'Cape',
  armour: 'Armure',
  handwear: 'Gants',
  footwear: 'Bottes',
  ring1: 'Bague (main gauche)',
  ring2: 'Bague (main droite)',
  clothing: 'Tenue de camp',
  mainHand: 'Arme principale',
  offHand: 'Main secondaire / Bouclier',
  ranged: 'Arme à distance',
}

export const equipmentSlotOrder: EquipmentSlotKey[] = [
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
]
