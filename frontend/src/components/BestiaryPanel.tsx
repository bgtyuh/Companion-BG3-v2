import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Enemy } from '../types'
import { Panel } from './Panel'

interface BestiaryPanelProps {
  enemies: Enemy[]
  onCreate: (enemy: Omit<Enemy, 'id'>) => Promise<void>
  onUpdate: (id: number, enemy: Omit<Enemy, 'id'>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

type EnemyFormState = {
  name: string
  stats: string
  resistances: string
  weaknesses: string
  abilities: string
  notes: string
}

const emptyEnemy: EnemyFormState = {
  name: '',
  stats: '',
  resistances: '',
  weaknesses: '',
  abilities: '',
  notes: '',
}

export function BestiaryPanel({ enemies, onCreate, onUpdate, onDelete }: BestiaryPanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(enemies[0]?.id ?? null)
  const [form, setForm] = useState<EnemyFormState>(emptyEnemy)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const filteredEnemies = useMemo(() => {
    const lower = search.toLowerCase()
    return enemies.filter((enemy) => enemy.name.toLowerCase().includes(lower))
  }, [enemies, search])

  const selectedEnemy = enemies.find((enemy) => enemy.id === selectedId) ?? null

  useEffect(() => {
    if (!enemies.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !enemies.some((enemy) => enemy.id === selectedId)) {
      setSelectedId(enemies[0].id)
    }
  }, [enemies, selectedId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim()) return

    const payload: Omit<Enemy, 'id'> = {
      name: form.name.trim(),
      stats: form.stats.trim(),
      resistances: form.resistances.trim(),
      weaknesses: form.weaknesses.trim(),
      abilities: form.abilities.trim(),
      notes: form.notes.trim(),
    }

    if (editingId) {
      await onUpdate(editingId, payload)
    } else {
      await onCreate(payload)
    }
    setForm({ ...emptyEnemy })
    setEditingId(null)
  }

  function startEdit(enemy: Enemy) {
    setEditingId(enemy.id)
    setForm({
      name: enemy.name,
      stats: enemy.stats ?? '',
      resistances: enemy.resistances ?? '',
      weaknesses: enemy.weaknesses ?? '',
      abilities: enemy.abilities ?? '',
      notes: enemy.notes ?? '',
    })
    setSelectedId(enemy.id)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({ ...emptyEnemy })
  }

  return (
    <Panel
      title="Bestiaire"
      subtitle="Préparez-vous face aux menaces majeures"
      collapsible
      actions={
        <input
          type="search"
          placeholder="Rechercher un ennemi"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      }
    >
      <div className="bestiary">
        <div className="bestiary__list">
          <ul>
            {filteredEnemies.map((enemy) => (
              <li key={enemy.id} className={enemy.id === selectedId ? 'active' : ''}>
                <button className="link" onClick={() => setSelectedId(enemy.id)}>
                  {enemy.name}
                </button>
                <div className="bestiary__actions">
                  <button className="link" onClick={() => startEdit(enemy)}>
                    Modifier
                  </button>
                  <button className="link link--danger" onClick={() => onDelete(enemy.id)}>
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
            {!filteredEnemies.length ? <p className="empty">Ajoutez vos fiches d'ennemis pour anticiper les affrontements.</p> : null}
          </ul>
        </div>
        <div className="bestiary__details">
          {selectedEnemy ? (
            <article className="enemy-card">
              <h3>{selectedEnemy.name}</h3>
              <p>
                <strong>Statistiques :</strong> {selectedEnemy.stats || '—'}
              </p>
              <p>
                <strong>Résistances :</strong> {selectedEnemy.resistances || '—'}
              </p>
              <p>
                <strong>Faiblesses :</strong> {selectedEnemy.weaknesses || '—'}
              </p>
              <p>
                <strong>Capacités :</strong> {selectedEnemy.abilities || '—'}
              </p>
              <p>
                <strong>Notes :</strong> {selectedEnemy.notes || '—'}
              </p>
            </article>
          ) : null}

          <form className="enemy-form" onSubmit={handleSubmit}>
            <h3>{editingId ? 'Modifier une fiche' : 'Ajouter un ennemi'}</h3>
            <label>
              Nom
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label>
              Statistiques
              <textarea
                rows={2}
                value={form.stats}
                onChange={(event) => setForm({ ...form, stats: event.target.value })}
              />
            </label>
            <label>
              Résistances
              <textarea
                rows={2}
                value={form.resistances}
                onChange={(event) => setForm({ ...form, resistances: event.target.value })}
              />
            </label>
            <label>
              Faiblesses
              <textarea
                rows={2}
                value={form.weaknesses}
                onChange={(event) => setForm({ ...form, weaknesses: event.target.value })}
              />
            </label>
            <label>
              Capacités
              <textarea
                rows={2}
                value={form.abilities}
                onChange={(event) => setForm({ ...form, abilities: event.target.value })}
              />
            </label>
            <label>
              Notes tactiques
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </label>
            <div className="form__actions">
              <button type="submit">{editingId ? 'Mettre à jour' : 'Ajouter au bestiaire'}</button>
              {editingId ? (
                <button type="button" className="link" onClick={cancelEdit}>
                  Annuler
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </Panel>
  )
}
