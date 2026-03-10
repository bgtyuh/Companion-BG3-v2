import { Suspense, lazy, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import './App.css'
import { api } from './api'
import type { Build, Enemy, LootItem } from './types'
import type { EquipmentTabId } from './components/EquipmentTabs'
import { LootChecklist } from './components/LootChecklist'
import { SpellLibrary } from './components/SpellLibrary'
import { FeatLibrary } from './components/FeatLibrary'
import { AbilityReference } from './components/AbilityReference'

const LOOT_QUERY_KEY = ['lootItems'] as const
const BUILDS_QUERY_KEY = ['builds'] as const
const ENEMIES_QUERY_KEY = ['enemies'] as const

const PartyPlanner = lazy(() =>
  import('./components/PartyPlanner').then((module) => ({ default: module.PartyPlanner })),
)
const BuildLibrary = lazy(() =>
  import('./components/BuildLibrary').then((module) => ({ default: module.BuildLibrary })),
)
const EquipmentTabs = lazy(() =>
  import('./components/EquipmentTabs').then((module) => ({ default: module.EquipmentTabs })),
)
const BestiaryPanel = lazy(() =>
  import('./components/BestiaryPanel').then((module) => ({ default: module.BestiaryPanel })),
)

type NamedEntity = { name: string }
type IdentifiedEntity = { id: number }
type WorkspaceId = 'expedition' | 'compagnie' | 'arsenal'

const WORKSPACES: ReadonlyArray<{ id: WorkspaceId; label: string; hint: string }> = [
  { id: 'expedition', label: 'Expedition', hint: 'Loot, sorts, dons' },
  { id: 'compagnie', label: 'Compagnie', hint: 'Planification et fiche perso' },
  { id: 'arsenal', label: 'Arsenal', hint: 'Builds, equipement, bestiaire' },
]

function sortByName<T extends NamedEntity>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function App() {
  const queryClient = useQueryClient()
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('compagnie')
  const [openedEquipmentTabs, setOpenedEquipmentTabs] = useState<Record<EquipmentTabId, boolean>>({
    armours: true,
    shields: false,
    weapons: false,
    clothing: false,
    headwears: false,
    handwears: false,
    footwears: false,
    cloaks: false,
    rings: false,
    amulets: false,
  })
  const workspaceRefs = useRef<Record<WorkspaceId, HTMLElement | null>>({
    expedition: null,
    compagnie: null,
    arsenal: null,
  })

  const lootQuery = useQuery({
    queryKey: LOOT_QUERY_KEY,
    queryFn: async () => sortByName(await api.getLootItems()),
  })
  const buildsQuery = useQuery({
    queryKey: BUILDS_QUERY_KEY,
    queryFn: async () => sortByName(await api.getBuilds()),
  })
  const enemiesQuery = useQuery({
    queryKey: ENEMIES_QUERY_KEY,
    queryFn: async () => sortByName(await api.getEnemies()),
  })
  const armoursQuery = useQuery({
    queryKey: ['armours'],
    queryFn: async () => sortByName(await api.getArmours()),
    enabled: openedEquipmentTabs.armours,
  })
  const ringsQuery = useQuery({
    queryKey: ['rings'],
    queryFn: async () => sortByName(await api.getRings()),
    enabled: openedEquipmentTabs.rings,
  })
  const amuletsQuery = useQuery({
    queryKey: ['amulets'],
    queryFn: async () => sortByName(await api.getAmulets()),
    enabled: openedEquipmentTabs.amulets,
  })
  const cloaksQuery = useQuery({
    queryKey: ['cloaks'],
    queryFn: async () => sortByName(await api.getCloaks()),
    enabled: openedEquipmentTabs.cloaks,
  })
  const clothingQuery = useQuery({
    queryKey: ['clothing'],
    queryFn: async () => sortByName(await api.getClothing()),
    enabled: openedEquipmentTabs.clothing,
  })
  const footwearsQuery = useQuery({
    queryKey: ['footwears'],
    queryFn: async () => sortByName(await api.getFootwears()),
    enabled: openedEquipmentTabs.footwears,
  })
  const handwearsQuery = useQuery({
    queryKey: ['handwears'],
    queryFn: async () => sortByName(await api.getHandwears()),
    enabled: openedEquipmentTabs.handwears,
  })
  const headwearsQuery = useQuery({
    queryKey: ['headwears'],
    queryFn: async () => sortByName(await api.getHeadwears()),
    enabled: openedEquipmentTabs.headwears,
  })
  const shieldsQuery = useQuery({
    queryKey: ['shields'],
    queryFn: async () => sortByName(await api.getShields()),
    enabled: openedEquipmentTabs.shields,
  })
  const weaponsQuery = useQuery({
    queryKey: ['weapons'],
    queryFn: async () => sortByName(await api.getWeapons()),
    enabled: openedEquipmentTabs.weapons,
  })
  const spellsQuery = useQuery({
    queryKey: ['spells'],
    queryFn: async () => sortByName(await api.getSpells()),
  })
  const racesQuery = useQuery({
    queryKey: ['races'],
    queryFn: async () => sortByName(await api.getRaces()),
  })
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: async () => sortByName(await api.getClasses()),
  })
  const backgroundsQuery = useQuery({
    queryKey: ['backgrounds'],
    queryFn: async () => sortByName(await api.getBackgrounds()),
  })
  const featsQuery = useQuery({
    queryKey: ['feats'],
    queryFn: async () => sortByName(await api.getFeats()),
  })
  const abilitiesQuery = useQuery({
    queryKey: ['abilities'],
    queryFn: async () => sortByName(await api.getAbilities()),
  })

  const primaryQueries = [
    lootQuery,
    buildsQuery,
    enemiesQuery,
    spellsQuery,
    racesQuery,
    classesQuery,
    backgroundsQuery,
    featsQuery,
    abilitiesQuery,
  ] as const
  const equipmentQueries = [
    armoursQuery,
    ringsQuery,
    amuletsQuery,
    cloaksQuery,
    clothingQuery,
    footwearsQuery,
    handwearsQuery,
    headwearsQuery,
    shieldsQuery,
    weaponsQuery,
  ] as const
  const queries = [...primaryQueries, ...equipmentQueries]

  function handleEquipmentTabChange(tabId: EquipmentTabId) {
    setOpenedEquipmentTabs((previous) => {
      if (previous[tabId]) {
        return previous
      }
      return { ...previous, [tabId]: true }
    })
  }

  function handleWorkspaceSelect(workspaceId: WorkspaceId) {
    setActiveWorkspace(workspaceId)
    const targetWorkspace = workspaceRefs.current[workspaceId]
    if (!targetWorkspace) {
      return
    }

    targetWorkspace.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }

  function appendSortedItem<T extends NamedEntity>(queryKey: readonly [string], item: T) {
    queryClient.setQueryData<T[]>(queryKey, (items = []) => sortByName([...items, item]))
  }

  function replaceSortedItem<T extends NamedEntity & IdentifiedEntity>(
    queryKey: readonly [string],
    id: number,
    item: T,
  ) {
    queryClient.setQueryData<T[]>(queryKey, (items = []) =>
      sortByName(items.map((entry) => (entry.id === id ? item : entry))),
    )
  }

  function removeItemById<T extends IdentifiedEntity>(queryKey: readonly [string], id: number) {
    queryClient.setQueryData<T[]>(queryKey, (items = []) => items.filter((entry) => entry.id !== id))
  }

  const isLoading = primaryQueries.some((query) => query.isPending && query.fetchStatus !== 'idle')
  const firstError = queries.find((query) => query.error)?.error
  const error =
    firstError == null
      ? null
      : firstError instanceof Error
        ? firstError.message
        : 'Impossible de charger les donnees.'

  async function handleCreateLoot(payload: { name: string; type?: string; region?: string; description?: string }) {
    const created = await api.createLootItem({ ...payload, is_collected: false })
    appendSortedItem(LOOT_QUERY_KEY, created)
  }

  async function handleToggleLoot(item: LootItem) {
    const updated = await api.updateLootItem(item.id, { is_collected: !item.is_collected })
    replaceSortedItem(LOOT_QUERY_KEY, item.id, updated)
  }

  async function handleDeleteLoot(item: LootItem) {
    await api.deleteLootItem(item.id)
    removeItemById<LootItem>(LOOT_QUERY_KEY, item.id)
  }

  async function handleCreateBuild(build: Omit<Build, 'id'>) {
    const created = await api.createBuild(build)
    appendSortedItem(BUILDS_QUERY_KEY, created)
  }

  async function handleUpdateBuild(id: number, build: Omit<Build, 'id'>) {
    const updated = await api.updateBuild(id, build)
    replaceSortedItem(BUILDS_QUERY_KEY, id, updated)
  }

  async function handleDeleteBuild(id: number) {
    await api.deleteBuild(id)
    removeItemById<Build>(BUILDS_QUERY_KEY, id)
  }

  async function handleCreateEnemy(enemy: Omit<Enemy, 'id'>) {
    const created = await api.createEnemy(enemy)
    appendSortedItem(ENEMIES_QUERY_KEY, created)
  }

  async function handleUpdateEnemy(id: number, enemy: Omit<Enemy, 'id'>) {
    const updated = await api.updateEnemy(id, enemy)
    replaceSortedItem(ENEMIES_QUERY_KEY, id, updated)
  }

  async function handleDeleteEnemy(id: number) {
    await api.deleteEnemy(id)
    removeItemById<Enemy>(ENEMIES_QUERY_KEY, id)
  }

  const lootItems = lootQuery.data ?? []
  const builds = buildsQuery.data ?? []
  const enemies = enemiesQuery.data ?? []
  const armours = armoursQuery.data ?? []
  const rings = ringsQuery.data ?? []
  const amulets = amuletsQuery.data ?? []
  const cloaks = cloaksQuery.data ?? []
  const clothing = clothingQuery.data ?? []
  const footwears = footwearsQuery.data ?? []
  const handwears = handwearsQuery.data ?? []
  const headwears = headwearsQuery.data ?? []
  const shields = shieldsQuery.data ?? []
  const weapons = weaponsQuery.data ?? []
  const spells = spellsQuery.data ?? []
  const races = racesQuery.data ?? []
  const classes = classesQuery.data ?? []
  const backgrounds = backgroundsQuery.data ?? []
  const feats = featsQuery.data ?? []
  const abilities = abilitiesQuery.data ?? []

  const equipmentCollections = {
    armours,
    weapons,
    shields,
    clothing,
    headwears,
    handwears,
    footwears,
    cloaks,
    rings,
    amulets,
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Character Build Management</h1>
          <p>Compagnon de campagne pour Baldur's Gate 3</p>
        </div>
        <div className="app__seal">
          <span>BG3</span>
        </div>
      </header>

      {error ? <div className="app__status app__status--error">{error}</div> : null}
      {isLoading ? <div className="app__status">Chargement des grimoires et tablettes...</div> : null}

      {!isLoading ? (
        <nav className="app__workspace-nav" aria-label="Navigation des espaces">
          {WORKSPACES.map((workspace) => {
            const buttonClassName = [
              'app__workspace-tab',
              activeWorkspace === workspace.id ? 'app__workspace-tab--active' : undefined,
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={workspace.id}
                type="button"
                className={buttonClassName}
                onClick={() => handleWorkspaceSelect(workspace.id)}
                aria-controls={`workspace-${workspace.id}`}
                aria-pressed={activeWorkspace === workspace.id}
              >
                <span className="app__workspace-label">{workspace.label}</span>
                <span className="app__workspace-hint">{workspace.hint}</span>
              </button>
            )
          })}
        </nav>
      ) : null}

      {!isLoading ? (
        <main className="app__grid">
          <section
            id="workspace-expedition"
            className="app__column"
            ref={(element) => {
              workspaceRefs.current.expedition = element
            }}
          >
            <LootChecklist
              items={lootItems}
              onCreate={handleCreateLoot}
              onToggle={handleToggleLoot}
              onDelete={handleDeleteLoot}
            />
            <SpellLibrary spells={spells} />
            <FeatLibrary feats={feats} />
          </section>

          <section
            id="workspace-compagnie"
            className="app__column app__column--wide"
            ref={(element) => {
              workspaceRefs.current.compagnie = element
            }}
          >
            <Suspense fallback={<div className="app__status">Chargement du party planner...</div>}>
              <PartyPlanner
                builds={builds}
                races={races}
                classes={classes}
                spells={spells}
                backgrounds={backgrounds}
                equipment={equipmentCollections}
              />
            </Suspense>
          </section>

          <section
            id="workspace-arsenal"
            className="app__column"
            ref={(element) => {
              workspaceRefs.current.arsenal = element
            }}
          >
            <Suspense fallback={<div className="app__status">Chargement de la bibliotheque de builds...</div>}>
              <BuildLibrary
                builds={builds}
                races={races}
                classes={classes}
                onCreate={handleCreateBuild}
                onUpdate={handleUpdateBuild}
                onDelete={handleDeleteBuild}
              />
            </Suspense>
            <Suspense fallback={<div className="app__status">Chargement des equipements...</div>}>
              <EquipmentTabs
                armours={armours}
                shields={shields}
                weapons={weapons}
                clothing={clothing}
                headwears={headwears}
                handwears={handwears}
                footwears={footwears}
                cloaks={cloaks}
                rings={rings}
                amulets={amulets}
                onTabChange={handleEquipmentTabChange}
              />
            </Suspense>
            <AbilityReference abilities={abilities} />
            <Suspense fallback={<div className="app__status">Chargement du bestiaire...</div>}>
              <BestiaryPanel
                enemies={enemies}
                onCreate={handleCreateEnemy}
                onUpdate={handleUpdateEnemy}
                onDelete={handleDeleteEnemy}
              />
            </Suspense>
          </section>
        </main>
      ) : null}
    </div>
  )
}

export default App

