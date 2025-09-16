import { useMemo, type ReactNode } from 'react'
import type {
  AbilityScoreKey,
  ArmourItem,
  Build,
  CharacterClass,
  EquipmentCollections,
  EquipmentSlotKey,
  PartyMember,
  Race,
  Spell,
  WeaponItem,
  ShieldItem,
  AccessoryItemBase,
  ClothingItem,
  FootwearItem,
} from '../types'
import { equipmentSlotLabels, equipmentSlotOrder } from '../utils/equipment'
import { getIconUrl, normalizeName, type IconCategory } from '../utils/icons'
import { getSpellLevelLabel, sortSpellsByLevel } from '../utils/spells'
import { IconCard } from './IconCard'
import { Panel } from './Panel'

interface CharacterSheetProps {
  member: PartyMember | null
  build: Build | undefined
  raceInfo: Race | undefined
  classInfo: CharacterClass | undefined
  spells: Spell[]
  equipmentData: EquipmentCollections
}

const abilityOrder: { key: AbilityScoreKey; label: string }[] = [
  { key: 'Strength', label: 'Force' },
  { key: 'Dexterity', label: 'Dextérité' },
  { key: 'Constitution', label: 'Constitution' },
  { key: 'Intelligence', label: 'Intelligence' },
  { key: 'Wisdom', label: 'Sagesse' },
  { key: 'Charisma', label: 'Charisme' },
]

type EquipmentEntry =
  | { category: 'armour'; item: ArmourItem }
  | { category: 'weapon'; item: WeaponItem }
  | { category: 'shield'; item: ShieldItem }
  | { category: 'clothing'; item: ClothingItem }
  | { category: 'footwear'; item: FootwearItem }
  | { category: 'ring'; item: AccessoryItemBase }
  | { category: 'amulet'; item: AccessoryItemBase }
  | { category: 'cloak'; item: AccessoryItemBase }
  | { category: 'handwear'; item: AccessoryItemBase }
  | { category: 'headwear'; item: AccessoryItemBase }

const slotCategories: Record<EquipmentSlotKey, IconCategory[]> = {
  headwear: ['headwear'],
  amulet: ['amulet'],
  cloak: ['cloak'],
  armour: ['armour'],
  handwear: ['handwear'],
  footwear: ['footwear'],
  ring1: ['ring'],
  ring2: ['ring'],
  clothing: ['clothing'],
  mainHand: ['weapon'],
  offHand: ['shield', 'weapon'],
  ranged: ['weapon'],
}

function addEquipmentEntry(map: Map<string, EquipmentEntry[]>, entry: EquipmentEntry) {
  const key = normalizeName(entry.item.name)
  if (!key) return
  const existing = map.get(key)
  if (existing) {
    existing.push(entry)
  } else {
    map.set(key, [entry])
  }
}

function findEquipmentEntry(
  lookup: Map<string, EquipmentEntry[]>,
  slot: EquipmentSlotKey,
  name: string,
): EquipmentEntry | null {
  const normalized = normalizeName(name)
  if (!normalized) return null
  const candidates = lookup.get(normalized)
  if (!candidates?.length) return null
  const categories = slotCategories[slot] ?? []
  for (const category of categories) {
    const match = candidates.find((entry) => entry.category === category)
    if (match) return match
  }
  return candidates[0] ?? null
}

function resolveIconUrl(
  name: string,
  entry: EquipmentEntry | null,
  preferredCategories: IconCategory[],
) {
  if (!name) return null
  const categories = entry
    ? [entry.category, ...preferredCategories.filter((category) => category !== entry.category)]
    : preferredCategories
  for (const category of categories) {
    const url = getIconUrl(category, name)
    if (url) return url
  }
  if (entry) {
    const url = getIconUrl(entry.category, name)
    if (url) return url
  }
  return null
}

function renderAccessoryTooltip(item: AccessoryItemBase, extras: ReactNode[] = []) {
  const location = item.locations[0]?.description
  const specials = item.specials.slice(0, 3)

  return (
    <>
      <div className="icon-grid__tooltip-meta">
        {item.type ? (
          <span>
            <strong>Type :</strong> {item.type}
          </span>
        ) : null}
        {item.rarity ? (
          <span>
            <strong>Rareté :</strong> {item.rarity}
          </span>
        ) : null}
        {extras.map((content, index) => (
          <span key={index}>{content}</span>
        ))}
        {item.price_gp != null ? (
          <span>
            <strong>Prix :</strong> {item.price_gp} po
          </span>
        ) : null}
      </div>
      {item.description ? <p className="icon-grid__tooltip-description">{item.description}</p> : null}
      {specials.length ? (
        <div className="icon-grid__tooltip-section">
          <strong>Effets</strong>
          <ul className="icon-grid__tooltip-list">
            {specials.map((special) => (
              <li key={special.name}>
                <span className="icon-grid__tooltip-list-title">{special.name}</span>
                {special.effect ? <span>{special.effect}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {location ? (
        <div className="icon-grid__tooltip-section">
          <strong>Obtention</strong>
          <p>{location}</p>
        </div>
      ) : null}
      {item.quote ? <p className="icon-grid__tooltip-quote">{item.quote}</p> : null}
    </>
  )
}

function renderArmourTooltip(item: ArmourItem) {
  const specials = item.specials.slice(0, 3)
  const location = item.locations[0]?.description

  return (
    <>
      <div className="icon-grid__tooltip-meta">
        {item.type ? (
          <span>
            <strong>Type :</strong> {item.type}
          </span>
        ) : null}
        {item.rarity ? (
          <span>
            <strong>Rareté :</strong> {item.rarity}
          </span>
        ) : null}
        <span>
          <strong>Classe d'armure :</strong> {item.armour_class_base ?? '—'}
          {item.armour_class_modifier ? ` (${item.armour_class_modifier})` : ''}
        </span>
        {item.weight_kg != null ? (
          <span>
            <strong>Poids :</strong> {item.weight_kg} kg
          </span>
        ) : null}
      </div>
      {item.description ? <p className="icon-grid__tooltip-description">{item.description}</p> : null}
      {specials.length ? (
        <div className="icon-grid__tooltip-section">
          <strong>Effets</strong>
          <ul className="icon-grid__tooltip-list">
            {specials.map((special) => (
              <li key={special.name}>
                <span className="icon-grid__tooltip-list-title">{special.name}</span>
                {special.effect ? <span>{special.effect}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {location ? (
        <div className="icon-grid__tooltip-section">
          <strong>Obtention</strong>
          <p>{location}</p>
        </div>
      ) : null}
      {item.quote ? <p className="icon-grid__tooltip-quote">{item.quote}</p> : null}
    </>
  )
}

function renderWeaponTooltip(item: WeaponItem) {
  const damages = item.damages.slice(0, 3)
  const actions = item.actions.slice(0, 2)
  const abilities = item.abilities.slice(0, 2)
  const location = item.locations[0]?.description

  return (
    <>
      <div className="icon-grid__tooltip-meta">
        {item.type ? (
          <span>
            <strong>Type :</strong> {item.type}
          </span>
        ) : null}
        {item.rarity ? (
          <span>
            <strong>Rareté :</strong> {item.rarity}
          </span>
        ) : null}
        {item.enchantment ? (
          <span>
            <strong>Enchantement :</strong> +{item.enchantment}
          </span>
        ) : null}
        {item.attributes ? (
          <span>
            <strong>Attributs :</strong> {item.attributes}
          </span>
        ) : null}
      </div>
      {item.description ? <p className="icon-grid__tooltip-description">{item.description}</p> : null}
      {damages.length ? (
        <div className="icon-grid__tooltip-section">
          <strong>Dégâts</strong>
          <ul className="icon-grid__tooltip-list">
            {damages.map((damage, index) => (
              <li key={`${item.weapon_id}-damage-${index}`}>
                <span className="icon-grid__tooltip-list-title">{damage.damage_type ?? '—'}</span>
                <span>
                  {damage.damage_dice ?? '—'} {damage.modifier ? `(${damage.modifier})` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {actions.length ? (
        <div className="icon-grid__tooltip-section">
          <strong>Actions</strong>
          <ul className="icon-grid__tooltip-list">
            {actions.map((action) => (
              <li key={action.name}>
                <span className="icon-grid__tooltip-list-title">{action.name}</span>
                {action.description ? <span>{action.description}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {abilities.length ? (
        <div className="icon-grid__tooltip-section">
          <strong>Propriétés</strong>
          <ul className="icon-grid__tooltip-list">
            {abilities.map((ability) => (
              <li key={ability.name}>
                <span className="icon-grid__tooltip-list-title">{ability.name}</span>
                {ability.description ? <span>{ability.description}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {location ? (
        <div className="icon-grid__tooltip-section">
          <strong>Obtention</strong>
          <p>{location}</p>
        </div>
      ) : null}
    </>
  )
}

function renderEquipmentTooltip(entry: EquipmentEntry) {
  switch (entry.category) {
    case 'armour':
      return renderArmourTooltip(entry.item)
    case 'weapon':
      return renderWeaponTooltip(entry.item)
    case 'shield':
      return renderAccessoryTooltip(
        entry.item,
        entry.item.shield_class_base != null
          ? [
              <>
                <strong>Classe de bouclier :</strong> {entry.item.shield_class_base}
              </>,
            ]
          : [],
      )
    case 'clothing': {
      const extras: ReactNode[] = []
      if (entry.item.armour_class_base != null) {
        extras.push(
          <>
            <strong>Classe d'armure :</strong> {entry.item.armour_class_base}
            {entry.item.armour_class_modifier ? ` (${entry.item.armour_class_modifier})` : ''}
          </>,
        )
      }
      return renderAccessoryTooltip(entry.item, extras)
    }
    case 'footwear':
      return renderAccessoryTooltip(
        entry.item,
        entry.item.required_proficiency
          ? [
              <>
                <strong>Maîtrise requise :</strong> {entry.item.required_proficiency}
              </>,
            ]
          : [],
      )
    default:
      return renderAccessoryTooltip(entry.item)
  }
}

function renderSpellTooltip(spell: Spell) {
  const properties = spell.properties.slice(0, 4)
  const levelLabel = getSpellLevelLabel(spell.level)
  const levelTitle = levelLabel === 'Cantrips' ? 'Type :' : 'Niveau :'

  return (
    <>
      <div className="icon-grid__tooltip-meta">
        {levelLabel ? (
          <span>
            <strong>{levelTitle}</strong> {levelLabel}
          </span>
        ) : null}
      </div>
      {spell.description ? <p className="icon-grid__tooltip-description">{spell.description}</p> : null}
      {properties.length ? (
        <div className="icon-grid__tooltip-section">
          <strong>Effets</strong>
          <ul className="icon-grid__tooltip-list">
            {properties.map((property) => (
              <li key={property.name}>
                <span className="icon-grid__tooltip-list-title">{property.name}</span>
                <span>{property.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}

function abilityModifier(score: number | undefined) {
  if (score === undefined) return 0
  return Math.floor((score - 10) / 2)
}

export function CharacterSheet({
  member,
  build,
  raceInfo,
  classInfo,
  spells,
  equipmentData,
}: CharacterSheetProps) {
  const equipmentLookup = useMemo(() => {
    const map = new Map<string, EquipmentEntry[]>()
    equipmentData.armours.forEach((item) => addEquipmentEntry(map, { category: 'armour', item }))
    equipmentData.weapons.forEach((item) => addEquipmentEntry(map, { category: 'weapon', item }))
    equipmentData.shields.forEach((item) => addEquipmentEntry(map, { category: 'shield', item }))
    equipmentData.clothing.forEach((item) => addEquipmentEntry(map, { category: 'clothing', item }))
    equipmentData.footwears.forEach((item) => addEquipmentEntry(map, { category: 'footwear', item }))
    equipmentData.rings.forEach((item) => addEquipmentEntry(map, { category: 'ring', item }))
    equipmentData.amulets.forEach((item) => addEquipmentEntry(map, { category: 'amulet', item }))
    equipmentData.cloaks.forEach((item) => addEquipmentEntry(map, { category: 'cloak', item }))
    equipmentData.handwears.forEach((item) => addEquipmentEntry(map, { category: 'handwear', item }))
    equipmentData.headwears.forEach((item) => addEquipmentEntry(map, { category: 'headwear', item }))
    return map
  }, [
    equipmentData.armours,
    equipmentData.weapons,
    equipmentData.shields,
    equipmentData.clothing,
    equipmentData.footwears,
    equipmentData.rings,
    equipmentData.amulets,
    equipmentData.cloaks,
    equipmentData.handwears,
    equipmentData.headwears,
  ])

  const knownSpells = useMemo(
    () => (member ? spells.filter((spell) => member.spells.includes(spell.name)).sort(sortSpellsByLevel) : []),
    [spells, member],
  )

  if (!member) {
    return (
      <Panel title="Fiche de personnage" subtitle="Sélectionnez un héros pour consulter ses détails">
        <p className="empty">Choisissez un compagnon dans la colonne de gauche pour afficher sa fiche.</p>
      </Panel>
    )
  }
  const gear = member.equipment ?? {}
  const nextLevel = Math.min(12, member.level + 1)
  const nextStep = build?.levels.find((level) => level.level === nextLevel)

  return (
    <Panel
      title={`Fiche de ${member.name}`}
      subtitle="Vue d'ensemble du personnage et de son plan de progression"
      className="character-sheet"
    >
      <section className="character-sheet__identity">
        <div>
          <h3>{member.name}</h3>
          <ul>
            <li>
              <strong>Niveau :</strong> {member.level}
            </li>
            {member.race ? (
              <li>
                <strong>Race :</strong> {member.race}
              </li>
            ) : null}
            {member.subrace ? (
              <li>
                <strong>Sous-race :</strong> {member.subrace}
              </li>
            ) : null}
            {member.class_name ? (
              <li>
                <strong>Classe :</strong> {member.class_name}
              </li>
            ) : null}
            {member.subclass ? (
              <li>
                <strong>Spécialisation :</strong> {member.subclass}
              </li>
            ) : null}
            {member.background ? (
              <li>
                <strong>Historique :</strong> {member.background}
              </li>
            ) : null}
            {raceInfo?.base_speed ? (
              <li>
                <strong>Vitesse :</strong> {raceInfo.base_speed}
              </li>
            ) : null}
          </ul>
        </div>
        <div className="character-sheet__build">
          <h4>Build assigné</h4>
          {build ? (
            <div>
              <p className="character-sheet__build-name">{build.name}</p>
              {build.notes ? <p className="character-sheet__notes">{build.notes}</p> : null}
              {nextStep ? (
                <div className="character-sheet__next-step">
                  <h5>Préparez le niveau {nextLevel}</h5>
                  <p>
                    <strong>Sorts :</strong> {nextStep.spells || '—'}
                  </p>
                  <p>
                    <strong>Dons :</strong> {nextStep.feats || '—'}
                  </p>
                  <p>
                    <strong>Choix spéciaux :</strong>{' '}
                    {nextStep.subclass_choice || nextStep.multiclass_choice || '—'}
                  </p>
                  {nextStep.note ? (
                    <p>
                      <strong>Note :</strong> {nextStep.note}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="character-sheet__notes">Ce build couvre jusqu'au niveau {build.levels.at(-1)?.level ?? ''}.</p>
              )}
            </div>
          ) : (
            <p className="empty">Aucun build sélectionné. Choisissez un plan pour guider la progression.</p>
          )}
        </div>
      </section>

      <section className="character-sheet__stats">
        <div>
          <h4>Caractéristiques</h4>
          <ul className="ability-grid">
            {abilityOrder.map(({ key, label }) => (
              <li key={key}>
                <span className="ability-grid__label">{label}</span>
                <span className="ability-grid__score">{member.abilityScores[key] ?? 10}</span>
                <span className="ability-grid__modifier">
                  {abilityModifier(member.abilityScores[key]) >= 0 ? '+' : ''}
                  {abilityModifier(member.abilityScores[key])}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Compétences</h4>
          <ul className="tag-list">
            {member.skills.length ? member.skills.map((skill) => <li key={skill}>{skill}</li>) : <li className="empty">—</li>}
          </ul>
        </div>
      </section>

      <section className="character-sheet__equipment">
        <h4>Équipement</h4>
        <div className="equipment-layout equipment-layout--sheet">
          <div className="equipment-layout__character" aria-hidden="true">
            <span>{member.name}</span>
          </div>
          {equipmentSlotOrder.map((slot) => {
            const value = gear[slot]
            const preferredCategories = slotCategories[slot] ?? []
            const entry = value ? findEquipmentEntry(equipmentLookup, slot, value) : null
            const iconUrl = value ? resolveIconUrl(value, entry, preferredCategories) : null

            return (
              <div key={slot} className={`equipment-slot equipment-slot--${slot} equipment-slot--read-only`}>
                <span className="equipment-slot__label">{equipmentSlotLabels[slot]}</span>
                {value ? (
                  <div className="equipment-slot__card">
                    <IconCard name={value} iconUrl={iconUrl}>
                      {entry ? (
                        renderEquipmentTooltip(entry)
                      ) : (
                        <p className="icon-grid__tooltip-description">Détails indisponibles pour cet objet.</p>
                      )}
                    </IconCard>
                  </div>
                ) : (
                  <span className="equipment-slot__value equipment-slot__value--empty">—</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="character-sheet__spellbook">
        <h4>Grimoire</h4>
        {knownSpells.length ? (
          <div className="icon-grid character-sheet__spell-grid">
            {knownSpells.map((spell) => (
              <IconCard key={spell.name} name={spell.name} iconUrl={getIconUrl('spell', spell.name)}>
                {renderSpellTooltip(spell)}
              </IconCard>
            ))}
          </div>
        ) : (
          <p className="empty">Ajoutez des sorts via le formulaire de gestion de l'équipe.</p>
        )}
      </section>

      {member.notes ? (
        <section className="character-sheet__notes-block">
          <h4>Notes personnelles</h4>
          <p>{member.notes}</p>
        </section>
      ) : null}

      {classInfo ? (
        <section className="character-sheet__progression">
          <h4>Table de progression : {classInfo.name}</h4>
          <div className="progression-table">
            {classInfo.progression.map((entry) => (
              <div key={entry.level} className={entry.level === nextLevel ? 'progression-table__row progression-table__row--active' : 'progression-table__row'}>
                <div>
                  <strong>Niveau {entry.level}</strong>
                </div>
                <div>
                  <strong>Bonus de maîtrise :</strong> {entry.proficiency_bonus || '—'}
                </div>
                <div>
                  <strong>Traits :</strong> {entry.features || '—'}
                </div>
                {entry.spell_slots_1st ? (
                  <div>
                    <strong>Emplacements :</strong> {entry.spell_slots_per_level || '1er:' + entry.spell_slots_1st}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Panel>
  )
}
