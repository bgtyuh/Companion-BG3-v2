const FEAT_CHOICE = 'Sélectionner un Don ou une amélioration de caractéristiques (ASI).'
const SPELL_PREPARATION_REMINDER = 'Ajuster votre liste de sorts préparés si nécessaire.'
const BARD_NEW_SPELL = 'Apprendre un nouveau sort connu (remplacement possible).'
const RANGER_NEW_SPELL = 'Apprendre un nouveau sort connu.'
const SORCERER_NEW_SPELL = 'Apprendre un nouveau sort connu.'
const WARLOCK_NEW_SPELL = 'Apprendre un nouveau sort connu.'
const WIZARD_GRIMOIRE_CHOICE = 'Ajouter 2 nouveaux sorts à votre grimoire.'

const classLevelChoices: Record<string, Partial<Record<number, string[]>>> = {
  Barbarian: {
    3: [
      'Choisir une sous-classe : Berserker, Wildheart, Wild Magic ou Path of the Giant.',
      'Wildheart : sélectionner un Cœur bestial.',
    ],
    4: [FEAT_CHOICE],
    6: ['Wildheart : choisir un Aspect animal.'],
    8: [FEAT_CHOICE],
    10: ['Wildheart : choisir un Aspect supplémentaire.'],
    12: [FEAT_CHOICE],
  },
  Bard: {
    1: ['Choisir 3 sorts connus et 2 tours de magie.'],
    2: ['Choisir 1 nouveau sort connu.'],
    3: [
      'Choisir un Collège : Lore, Valour ou Swords.',
      BARD_NEW_SPELL,
    ],
    4: [FEAT_CHOICE, BARD_NEW_SPELL],
    5: [BARD_NEW_SPELL],
    6: [BARD_NEW_SPELL],
    7: [BARD_NEW_SPELL],
    8: [FEAT_CHOICE, BARD_NEW_SPELL],
    9: [BARD_NEW_SPELL],
    10: [
      BARD_NEW_SPELL,
      'College of Lore : choisir 2 compétences supplémentaires.',
    ],
    12: [FEAT_CHOICE],
  },
  Cleric: {
    1: [
      'Choisir un Domaine divin (Life, Light, Trickery, etc.).',
      'Préparer vos sorts de clerc avant chaque journée.',
    ],
    4: [FEAT_CHOICE],
    8: [FEAT_CHOICE],
    12: [FEAT_CHOICE],
  },
  Druid: {
    1: [
      'Préparer vos sorts de druide avant de partir à l’aventure.',
    ],
    2: [
      'Choisir un Cercle druidique : Moon, Land ou Spores.',
      SPELL_PREPARATION_REMINDER,
    ],
    3: [SPELL_PREPARATION_REMINDER],
    4: [FEAT_CHOICE, SPELL_PREPARATION_REMINDER],
    5: [SPELL_PREPARATION_REMINDER],
    6: [SPELL_PREPARATION_REMINDER],
    7: [SPELL_PREPARATION_REMINDER],
    8: [FEAT_CHOICE, SPELL_PREPARATION_REMINDER],
    9: [SPELL_PREPARATION_REMINDER],
    10: [SPELL_PREPARATION_REMINDER],
    11: [SPELL_PREPARATION_REMINDER],
    12: [FEAT_CHOICE, SPELL_PREPARATION_REMINDER],
  },
  Fighter: {
    1: ['Choisir un Style de combat.'],
    3: [
      'Choisir une sous-classe : Champion, Battle Master ou Eldritch Knight.',
      'Battle Master : sélectionner 3 manœuvres.',
      'Eldritch Knight : choisir 2 tours de magie et 3 sorts connus.',
    ],
    4: [FEAT_CHOICE],
    6: [FEAT_CHOICE],
    7: ['Battle Master : choisir 2 manœuvres supplémentaires.'],
    8: [FEAT_CHOICE],
    10: ['Battle Master : choisir 2 manœuvres supplémentaires.'],
    12: [FEAT_CHOICE],
  },
  Monk: {
    3: [
      'Choisir une Tradition : Open Hand, Shadow ou Four Elements.',
      'Four Elements : sélectionner des techniques élémentaires.',
    ],
    4: [FEAT_CHOICE],
    6: ['Four Elements : apprendre une technique élémentaire supplémentaire.'],
    8: [FEAT_CHOICE],
    11: ['Four Elements : apprendre une technique élémentaire supplémentaire.'],
    12: [FEAT_CHOICE],
  },
  Paladin: {
    1: ['Choisir un Serment : Devotion, Ancients ou Vengeance.'],
    2: [
      'Choisir un Style de combat.',
      'Préparer vos sorts de paladin (liste flexible).',
    ],
    4: [FEAT_CHOICE],
    8: [FEAT_CHOICE],
    12: [FEAT_CHOICE],
  },
  Ranger: {
    1: ['Choisir un Ennemi favori et un Explorateur naturel.'],
    2: [
      'Choisir un Style de combat.',
      'Apprendre 2 sorts connus.',
    ],
    3: [
      'Choisir une sous-classe : Hunter, Beast Master ou Gloom Stalker.',
      'Beast Master : choisir un compagnon animal.',
    ],
    4: [FEAT_CHOICE],
    5: [RANGER_NEW_SPELL],
    7: ['Hunter : sélectionner une option défensive (Escape the Horde, etc.).'],
    8: [FEAT_CHOICE],
    9: [RANGER_NEW_SPELL],
    12: [FEAT_CHOICE],
  },
  Rogue: {
    1: ['Choisir 2 compétences pour Expertise.'],
    3: [
      'Choisir une sous-classe : Thief, Assassin ou Arcane Trickster.',
      'Arcane Trickster : choisir des sorts connus (dont 2 d’Illusion ou d’Enchantement).',
    ],
    4: [FEAT_CHOICE],
    6: ['Choisir 2 compétences supplémentaires pour Expertise.'],
    8: [FEAT_CHOICE],
    12: [FEAT_CHOICE],
  },
  Sorcerer: {
    1: [
      'Choisir un lignage de sorcier : Draconic, Wild Magic ou Storm.',
      'Choisir 4 sorts connus et 2 tours de magie.',
    ],
    2: ['Choisir 2 options de Métamagie.'],
    3: [SORCERER_NEW_SPELL],
    4: [FEAT_CHOICE],
    5: [SORCERER_NEW_SPELL],
    7: [SORCERER_NEW_SPELL],
    8: [FEAT_CHOICE],
    9: [SORCERER_NEW_SPELL],
    10: ['Choisir une option de Métamagie supplémentaire.'],
    11: [SORCERER_NEW_SPELL],
    12: [FEAT_CHOICE],
  },
  Warlock: {
    1: [
      'Choisir un Patron : Fiend, Archfey ou Great Old One.',
      'Choisir 2 tours de magie et 2 sorts connus.',
    ],
    2: ['Choisir 2 invocations occultes.'],
    3: ['Choisir un Pact Boon : Chain, Blade ou Tome.'],
    4: [FEAT_CHOICE],
    5: [WARLOCK_NEW_SPELL],
    7: [WARLOCK_NEW_SPELL, 'Choisir des invocations occultes supplémentaires.'],
    8: [FEAT_CHOICE],
    9: [WARLOCK_NEW_SPELL, 'Choisir des invocations occultes supplémentaires.'],
    11: [WARLOCK_NEW_SPELL],
    12: [FEAT_CHOICE, 'Choisir des invocations occultes supplémentaires.'],
  },
  Wizard: {
    1: [
      'Choisir 6 sorts pour votre grimoire et 3 tours de magie.',
      'Préparer votre liste de sorts après chaque repos long.',
    ],
    2: ['Choisir une École de magie.', WIZARD_GRIMOIRE_CHOICE],
    3: [WIZARD_GRIMOIRE_CHOICE],
    4: [FEAT_CHOICE, WIZARD_GRIMOIRE_CHOICE],
    5: [WIZARD_GRIMOIRE_CHOICE],
    6: [WIZARD_GRIMOIRE_CHOICE],
    7: [WIZARD_GRIMOIRE_CHOICE],
    8: [FEAT_CHOICE, WIZARD_GRIMOIRE_CHOICE],
    9: [WIZARD_GRIMOIRE_CHOICE],
    10: [WIZARD_GRIMOIRE_CHOICE],
    11: [WIZARD_GRIMOIRE_CHOICE],
    12: [FEAT_CHOICE, WIZARD_GRIMOIRE_CHOICE],
  },
}

export function getClassLevelChoices(className: string, level: number): string[] {
  return classLevelChoices[className]?.[level] ?? []
}
