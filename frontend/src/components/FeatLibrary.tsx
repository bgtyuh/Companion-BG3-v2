import { useMemo, useState } from 'react'
import type { Feat } from '../types'
import { Panel } from './Panel'

interface FeatLibraryProps {
  feats: Feat[]
}

function normalizeFeatNotes(notes: Feat['notes']): string[] {
  return notes
    .map((note) => {
      if (typeof note === 'string') {
        return note.trim()
      }
      if (note && typeof note.note === 'string') {
        return note.note.trim()
      }
      return ''
    })
    .filter((note) => note.length > 0)
}

function matchesSearch(feat: Feat, query: string) {
  const lower = query.trim().toLowerCase()
  if (!lower) return true

  if (feat.name.toLowerCase().includes(lower)) {
    return true
  }

  const prerequisite = feat.prerequisite?.toLowerCase() ?? ''
  if (prerequisite && prerequisite.includes(lower)) {
    return true
  }

  if (feat.description?.toLowerCase().includes(lower)) {
    return true
  }

  if (normalizeFeatNotes(feat.notes).some((note) => note.toLowerCase().includes(lower))) {
    return true
  }

  return feat.options.some((option) => {
    if (option.name.toLowerCase().includes(lower)) {
      return true
    }
    return option.description?.toLowerCase().includes(lower) ?? false
  })
}

export function FeatLibrary({ feats }: FeatLibraryProps) {
  const [search, setSearch] = useState('')
  const [prerequisite, setPrerequisite] = useState('')

  const { prerequisiteOptions, hasFeatsWithoutPrerequisite } = useMemo(() => {
    const values = new Set<string>()
    let includeEmpty = false

    feats.forEach((feat) => {
      const trimmed = feat.prerequisite?.trim()
      if (trimmed) {
        values.add(trimmed)
      } else {
        includeEmpty = true
      }
    })

    const options = Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'))

    return {
      prerequisiteOptions: options,
      hasFeatsWithoutPrerequisite: includeEmpty,
    }
  }, [feats])

  const filteredFeats = useMemo(() => {
    return feats
      .filter((feat) => {
        if (!prerequisite) return true
        const trimmed = feat.prerequisite?.trim()
        if (prerequisite === 'none') {
          return !trimmed
        }
        return trimmed === prerequisite
      })
      .filter((feat) => matchesSearch(feat, search))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [feats, prerequisite, search])

  return (
    <Panel
      title="Arsenal de dons"
      subtitle="Gardez un œil sur les options offertes par les dons"
      collapsible
    >
      <div className="filters">
        <input
          type="search"
          placeholder="Rechercher un don"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={prerequisite} onChange={(event) => setPrerequisite(event.target.value)}>
          <option value="">Tous les prérequis</option>
          {hasFeatsWithoutPrerequisite ? (
            <option value="none">Sans prérequis</option>
          ) : null}
          {prerequisiteOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="feat-library">
        {filteredFeats.map((feat) => {
          const prerequisiteLabel = feat.prerequisite?.trim()
          const notes = normalizeFeatNotes(feat.notes)
          return (
            <article key={feat.name} className="feat-card">
              <header className="feat-card__header">
                <h3 className="feat-card__title">{feat.name}</h3>
                {prerequisiteLabel ? (
                  <span className="feat-card__prerequisite">{prerequisiteLabel}</span>
                ) : (
                  <span className="feat-card__prerequisite feat-card__prerequisite--none">
                    Aucun prérequis
                  </span>
                )}
              </header>
              {feat.description ? (
                <p className="feat-card__description">{feat.description}</p>
              ) : null}
              {feat.options.length ? (
                <div className="feat-card__options">
                  <strong>Options</strong>
                  <ul>
                    {feat.options.map((option) => (
                      <li key={option.name}>
                        <span className="feat-card__option-name">{option.name}</span>
                        {option.description ? <p>{option.description}</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {notes.length ? (
                <div className="feat-card__notes">
                  <strong>Conseils</strong>
                  <ul>
                    {notes.map((note, index) => (
                      <li key={`${feat.name}-note-${index}`}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          )
        })}
        {!filteredFeats.length ? (
          <p className="empty">Aucun don ne correspond à vos critères actuels.</p>
        ) : null}
      </div>
    </Panel>
  )
}
