import type { ReactNode } from 'react'
import type { AccessoryItemBase, ArmourItem, WeaponItem } from '../types'

export function renderAccessoryTooltip(item: AccessoryItemBase, extras: ReactNode[] = []) {
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
            <strong>Rarete :</strong> {item.rarity}
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

export function renderArmourTooltip(item: ArmourItem) {
  const extras: ReactNode[] = [
    <>
      <strong>Classe d'armure :</strong> {item.armour_class_base ?? '-'}
      {item.armour_class_modifier ? ` (${item.armour_class_modifier})` : ''}
    </>,
  ]

  if (item.weight_kg != null) {
    extras.push(
      <>
        <strong>Poids :</strong> {item.weight_kg} kg
      </>,
    )
  }

  return renderAccessoryTooltip(item, extras)
}

export function renderWeaponTooltip(item: WeaponItem) {
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
            <strong>Rarete :</strong> {item.rarity}
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
          <strong>Degats</strong>
          <ul className="icon-grid__tooltip-list">
            {damages.map((damage, index) => (
              <li key={`${item.weapon_id}-damage-${index}`}>
                <span className="icon-grid__tooltip-list-title">{damage.damage_type ?? '-'}</span>
                <span>
                  {damage.damage_dice ?? '-'} {damage.modifier ? `(${damage.modifier})` : ''}
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
          <strong>Proprietes</strong>
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
