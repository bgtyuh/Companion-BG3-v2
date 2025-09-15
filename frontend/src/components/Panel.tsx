import { useId, useState } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import './panel.css'

interface PanelProps extends PropsWithChildren {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}

export function Panel({
  title,
  subtitle,
  children,
  actions,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: PanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const bodyId = useId()

  const showHeaderActions = Boolean(actions) || collapsible
  const sectionClassName = ['panel', className, collapsed ? 'panel--collapsed' : undefined]
    .filter(Boolean)
    .join(' ')

  function toggleCollapse() {
    if (!collapsible) return
    setCollapsed((previous) => !previous)
  }

  const toggleLabel = collapsed ? 'Déplier' : 'Replier'
  const toggleIcon = collapsed ? '▸' : '▾'

  return (
    <section className={sectionClassName}>
      <header className="panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
        </div>
        {showHeaderActions ? (
          <div className="panel__actions">
            {collapsible ? (
              <button
                type="button"
                className="panel__toggle"
                onClick={toggleCollapse}
                aria-expanded={!collapsed}
                aria-controls={bodyId}
              >
                <span className="panel__toggle-icon" aria-hidden="true">
                  {toggleIcon}
                </span>
                {toggleLabel}
              </button>
            ) : null}
            {actions}
          </div>
        ) : null}
      </header>
      <div className="panel__body" id={bodyId} hidden={collapsed}>
        {children}
      </div>
    </section>
  )
}
