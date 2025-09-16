import { useId, type ReactNode } from 'react'

interface IconCardProps {
  name: string
  iconUrl: string | null
  children?: ReactNode
}

export function IconCard({ name, iconUrl, children }: IconCardProps) {
  const tooltipId = useId()
  const hasTooltip = Boolean(children)

  return (
    <div
      className="icon-grid__item"
      tabIndex={0}
      aria-describedby={hasTooltip ? tooltipId : undefined}
    >
      <div className="icon-grid__image" aria-hidden="true">
        {iconUrl ? (
          <img src={iconUrl} alt="" loading="lazy" />
        ) : (
          <span className="icon-grid__placeholder" aria-hidden="true">
            {name
              .split(' ')
              .map((part) => part.charAt(0))
              .join('')
              .slice(0, 2)
              .toUpperCase() || '?'}
          </span>
        )}
      </div>
      <span className="icon-grid__label" title={name}>
        <span className="icon-grid__label-text">{name}</span>
      </span>
      {hasTooltip ? (
        <div className="icon-grid__tooltip" id={tooltipId} role="tooltip">
          <div className="icon-grid__tooltip-content">{children}</div>
        </div>
      ) : null}
    </div>
  )
}
