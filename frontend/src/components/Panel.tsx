import type { PropsWithChildren, ReactNode } from 'react'
import './panel.css'

interface PanelProps extends PropsWithChildren {
  title: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function Panel({ title, subtitle, children, actions, className }: PanelProps) {
  return (
    <section className={`panel ${className ?? ''}`}>
      <header className="panel__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel__actions">{actions}</div> : null}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  )
}
