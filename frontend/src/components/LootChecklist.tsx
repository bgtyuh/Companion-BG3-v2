import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { LootItem } from '../types'
import { Panel } from './Panel'

interface LootChecklistProps {
  items: LootItem[]
  onCreate: (payload: { name: string; type?: string; region?: string; description?: string }) => Promise<void>
  onToggle: (item: LootItem) => Promise<void>
  onDelete: (item: LootItem) => Promise<void>
}

export function LootChecklist({ items, onCreate, onToggle, onDelete }: LootChecklistProps) {
  const [form, setForm] = useState({ name: '', type: '', region: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCompleted, setShowCompleted] = useState(true)

  const progress = useMemo(() => {
    if (!items.length) return 0
    const collected = items.filter((item) => item.is_collected).length
    return Math.round((collected / items.length) * 100)
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => (showCompleted ? true : !item.is_collected))
  }, [items, showCompleted])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) {
      return
    }
    setIsSubmitting(true)
    try {
      await onCreate({
        name: form.name.trim(),
        type: form.type.trim() || undefined,
        region: form.region.trim() || undefined,
        description: form.description.trim() || undefined,
      })
      setForm({ name: '', type: '', region: '', description: '' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Panel
      title="Butin prioritaire"
      subtitle="Suivez les objets essentiels à récupérer"
      actions={
        <label className="toggle">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => setShowCompleted(event.target.checked)}
          />
          <span>Voir les objets récupérés</span>
        </label>
      }
    >
      <div className="progress">
        <div className="progress__bar" style={{ width: `${progress}%` }} />
        <span className="progress__label">{progress}% collecté</span>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <label>
            Objet
            <input
              type="text"
              required
              value={form.name}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              placeholder="Pierre de Nether, gantelets, etc."
            />
          </label>
          <label>
            Type
            <input
              type="text"
              value={form.type}
              onChange={(event) => setForm((state) => ({ ...state, type: event.target.value }))}
              placeholder="Arme, armure, relique..."
            />
          </label>
        </div>
        <div className="form__row">
          <label>
            Région
            <input
              type="text"
              value={form.region}
              onChange={(event) => setForm((state) => ({ ...state, region: event.target.value }))}
              placeholder="Acte I - Bois Maudits"
            />
          </label>
          <label>
            Notes
            <input
              type="text"
              value={form.description}
              onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
              placeholder="Déblocage ou recommandation"
            />
          </label>
        </div>
        <button type="submit" disabled={isSubmitting}>
          Ajouter à la liste
        </button>
      </form>
      <ul className="loot-list">
        {filteredItems.map((item) => (
          <li key={item.id} className={item.is_collected ? 'loot-list__item loot-list__item--done' : 'loot-list__item'}>
            <label>
              <input type="checkbox" checked={item.is_collected} onChange={() => onToggle(item)} />
              <span className="loot-list__name">{item.name}</span>
            </label>
            <div className="loot-list__details">
              {item.type ? <span>{item.type}</span> : null}
              {item.region ? <span>{item.region}</span> : null}
              {item.description ? <span className="loot-list__description">{item.description}</span> : null}
            </div>
            <button className="link" onClick={() => onDelete(item)}>
              Retirer
            </button>
          </li>
        ))}
        {!filteredItems.length ? <p className="empty">Ajoutez des objectifs pour préparer vos expéditions.</p> : null}
      </ul>
    </Panel>
  )
}
