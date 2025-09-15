import { fireEvent, render, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { LootChecklist } from '../components/LootChecklist'
import type { LootItem } from '../types'

const defaultItems: LootItem[] = [
  {
    id: 1,
    name: 'Pierre de Nether',
    type: 'Artefact',
    region: 'Acte I',
    description: 'Permet d\'ouvrir un portail',
    is_collected: false,
  },
  {
    id: 2,
    name: 'Gantelets du tonnerre',
    type: 'Gants',
    region: 'Acte II',
    description: 'Renforce la puissance de frappe',
    is_collected: true,
  },
]

type LootChecklistProps = ComponentProps<typeof LootChecklist>

function renderLootChecklist(overrides: Partial<LootChecklistProps> = {}) {
  const onCreate = overrides.onCreate ?? vi.fn().mockResolvedValue(undefined)
  const onToggle = overrides.onToggle ?? vi.fn().mockResolvedValue(undefined)
  const onDelete = overrides.onDelete ?? vi.fn().mockResolvedValue(undefined)

  const props: LootChecklistProps = {
    items: overrides.items ?? defaultItems,
    onCreate,
    onToggle,
    onDelete,
    ...overrides,
  }

  const { container } = render(<LootChecklist {...props} />)
  const section = container.querySelector('section.panel') as HTMLElement | null

  if (!section) {
    throw new Error('LootChecklist panel not found')
  }

  return { section, onCreate, onToggle, onDelete }
}

describe('LootChecklist', () => {
  it('affiche le panneau du butin et les objets fournis', () => {
    const { section } = renderLootChecklist()
    const checklist = within(section)

    expect(checklist.getByRole('heading', { name: 'Butin prioritaire' })).toBeDefined()
    expect(checklist.getByText('50% collecté')).toBeDefined()
    expect(checklist.getByText('2 objets')).toBeDefined()

    const todoCheckbox = checklist.getByRole('checkbox', { name: 'Pierre de Nether' }) as HTMLInputElement
    const doneCheckbox = checklist.getByRole('checkbox', { name: 'Gantelets du tonnerre' }) as HTMLInputElement

    expect(todoCheckbox.checked).toBe(false)
    expect(doneCheckbox.checked).toBe(true)
  })

  it('permet de masquer les objets déjà collectés', async () => {
    const { section } = renderLootChecklist()
    const checklist = within(section)

    const toggle = checklist.getByLabelText('Voir les objets récupérés') as HTMLInputElement
    expect(toggle.checked).toBe(true)

    fireEvent.click(toggle)

    expect(toggle.checked).toBe(false)
    await waitFor(() => {
      expect(checklist.queryByText('Gantelets du tonnerre')).toBeNull()
    })
    expect(checklist.getByText('1 objet')).toBeDefined()
  })

  it('filtre la liste en fonction de la recherche', async () => {
    const { section } = renderLootChecklist()
    const checklist = within(section)

    const searchInput = checklist.getByRole('searchbox', {
      name: 'Rechercher dans les objets à récupérer',
    }) as HTMLInputElement

    fireEvent.change(searchInput, { target: { value: 'tonnerre' } })

    await waitFor(() => {
      expect(checklist.getByText('Gantelets du tonnerre')).toBeDefined()
    })
    expect(checklist.queryByText('Pierre de Nether')).toBeNull()
    expect(checklist.getByText('1 objet')).toBeDefined()
  })

  it('soumet un nouvel objet et réinitialise le formulaire', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    const { section } = renderLootChecklist({ items: [], onCreate })
    const checklist = within(section)

    const nameInput = checklist.getByLabelText('Objet') as HTMLInputElement
    const typeInput = checklist.getByLabelText('Type') as HTMLInputElement
    const regionInput = checklist.getByLabelText('Région') as HTMLInputElement
    const notesInput = checklist.getByLabelText('Notes') as HTMLInputElement
    const submitButton = checklist.getByRole('button', { name: 'Ajouter à la liste' }) as HTMLButtonElement

    fireEvent.change(nameInput, { target: { value: '   Lame de lune   ' } })
    fireEvent.change(typeInput, { target: { value: '   Arme   ' } })
    fireEvent.change(regionInput, { target: { value: '   Acte III   ' } })
    fireEvent.change(notesInput, { target: { value: '   Élément clé   ' } })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1)
    })
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Lame de lune',
      type: 'Arme',
      region: 'Acte III',
      description: 'Élément clé',
    })

    await waitFor(() => {
      expect(nameInput.value).toBe('')
    })
    expect(typeInput.value).toBe('')
    expect(regionInput.value).toBe('')
    expect(notesInput.value).toBe('')
    expect(submitButton.disabled).toBe(false)
  })

  it('déclenche les actions de bascule et de suppression', () => {
    const onToggle = vi.fn().mockResolvedValue(undefined)
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const { section } = renderLootChecklist({ onToggle, onDelete })
    const checklist = within(section)

    const firstItemCheckbox = checklist.getByRole('checkbox', { name: 'Pierre de Nether' })
    fireEvent.click(firstItemCheckbox)

    expect(onToggle).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Pierre de Nether' }),
    )

    const removeButtons = checklist.getAllByRole('button', { name: 'Retirer' })
    fireEvent.click(removeButtons[0])

    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Pierre de Nether' }),
    )
  })
})
