import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import './App.css'
import { api } from './api'
import type { Build, Enemy, LootItem } from './types'
import { BestiaryPanel } from './components/BestiaryPanel'
import { BuildLibrary } from './components/BuildLibrary'
import { EquipmentTabs, type EquipmentTabId } from './components/EquipmentTabs'
import { LootChecklist } from './components/LootChecklist'
import { PartyPlanner } from './components/PartyPlanner'
import { SpellLibrary } from './components/SpellLibrary'
import { FeatLibrary } from './components/FeatLibrary'
import { AbilityReference } from './components/AbilityReference'

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function App() {
  const queryClient = useQueryClient()
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

  const lootQuery = useQuery({
    queryKey: ['lootItems'],
    queryFn: async () => sortByName(await api.getLootItems()),
  })
  const buildsQuery = useQuery({
    queryKey: ['builds'],
    queryFn: async () => sortByName(await api.getBuilds()),
  })
  const enemiesQuery = useQuery({
    queryKey: ['enemies'],
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

  const isLoading = primaryQueries.some((query) => query.isPending && query.fetchStatus !== 'idle')
  const firstError = queries.find((query) => query.error)?.error
  const error =
    firstError == null
      ? null
      : firstError instanceof Error
        ? firstError.message
        : 'Impossible de charger les données.'

  async function handleCreateLoot(payload: { name: string; type?: string; region?: string; description?: string }) {
    const created = await api.createLootItem({ ...payload, is_collected: false })
    queryClient.setQueryData<LootItem[]>(['lootItems'], (items = []) => sortByName([...items, created]))
  }

  async function handleToggleLoot(item: LootItem) {
    const updated = await api.updateLootItem(item.id, { is_collected: !item.is_collected })
    queryClient.setQueryData<LootItem[]>(['lootItems'], (items = []) =>
      sortByName(items.map((entry) => (entry.id === item.id ? updated : entry))),
    )
  }

  async function handleDeleteLoot(item: LootItem) {
    await api.deleteLootItem(item.id)
    queryClient.setQueryData<LootItem[]>(['lootItems'], (items = []) =>
      items.filter((entry) => entry.id !== item.id),
    )
  }

  async function handleCreateBuild(build: Omit<Build, 'id'>) {
    const created = await api.createBuild(build)
    queryClient.setQueryData<Build[]>(['builds'], (items = []) => sortByName([...items, created]))
  }

  async function handleUpdateBuild(id: number, build: Omit<Build, 'id'>) {
    const updated = await api.updateBuild(id, build)
    queryClient.setQueryData<Build[]>(['builds'], (items = []) =>
      sortByName(items.map((entry) => (entry.id === id ? updated : entry))),
    )
  }

  async function handleDeleteBuild(id: number) {
    await api.deleteBuild(id)
    queryClient.setQueryData<Build[]>(['builds'], (items = []) => items.filter((entry) => entry.id !== id))
  }

  async function handleCreateEnemy(enemy: Omit<Enemy, 'id'>) {
    const created = await api.createEnemy(enemy)
    queryClient.setQueryData<Enemy[]>(['enemies'], (items = []) => sortByName([...items, created]))
  }

  async function handleUpdateEnemy(id: number, enemy: Omit<Enemy, 'id'>) {
    const updated = await api.updateEnemy(id, enemy)
    queryClient.setQueryData<Enemy[]>(['enemies'], (items = []) =>
      sortByName(items.map((entry) => (entry.id === id ? updated : entry))),
    )
  }

  async function handleDeleteEnemy(id: number) {
    await api.deleteEnemy(id)
    queryClient.setQueryData<Enemy[]>(['enemies'], (items = []) => items.filter((entry) => entry.id !== id))
  }

  const lootItems = useMemo(() => lootQuery.data ?? [], [lootQuery.data])
  const builds = useMemo(() => buildsQuery.data ?? [], [buildsQuery.data])
  const enemies = useMemo(() => enemiesQuery.data ?? [], [enemiesQuery.data])
  const armours = useMemo(() => armoursQuery.data ?? [], [armoursQuery.data])
  const rings = useMemo(() => ringsQuery.data ?? [], [ringsQuery.data])
  const amulets = useMemo(() => amuletsQuery.data ?? [], [amuletsQuery.data])
  const cloaks = useMemo(() => cloaksQuery.data ?? [], [cloaksQuery.data])
  const clothing = useMemo(() => clothingQuery.data ?? [], [clothingQuery.data])
  const footwears = useMemo(() => footwearsQuery.data ?? [], [footwearsQuery.data])
  const handwears = useMemo(() => handwearsQuery.data ?? [], [handwearsQuery.data])
  const headwears = useMemo(() => headwearsQuery.data ?? [], [headwearsQuery.data])
  const shields = useMemo(() => shieldsQuery.data ?? [], [shieldsQuery.data])
  const weapons = useMemo(() => weaponsQuery.data ?? [], [weaponsQuery.data])
  const spells = useMemo(() => spellsQuery.data ?? [], [spellsQuery.data])
  const races = useMemo(() => racesQuery.data ?? [], [racesQuery.data])
  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data])
  const backgrounds = useMemo(() => backgroundsQuery.data ?? [], [backgroundsQuery.data])
  const feats = useMemo(() => featsQuery.data ?? [], [featsQuery.data])
  const abilities = useMemo(() => abilitiesQuery.data ?? [], [abilitiesQuery.data])

  const equipmentCollections = useMemo(
    () => ({
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
    }),
    [armours, weapons, shields, clothing, headwears, handwears, footwears, cloaks, rings, amulets],
  )

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
        <main className="app__grid">
          <div className="app__column">
            <LootChecklist
              items={lootItems}
              onCreate={handleCreateLoot}
              onToggle={handleToggleLoot}
              onDelete={handleDeleteLoot}
            />
            <SpellLibrary spells={spells} />
            <FeatLibrary feats={feats} />
          </div>

          <div className="app__column app__column--wide">
            <PartyPlanner
              builds={builds}
              races={races}
              classes={classes}
              spells={spells}
              backgrounds={backgrounds}
              equipment={equipmentCollections}
            />
          </div>

          <div className="app__column">
            <BuildLibrary
              builds={builds}
              races={races}
              classes={classes}
              onCreate={handleCreateBuild}
              onUpdate={handleUpdateBuild}
              onDelete={handleDeleteBuild}
            />
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
            <AbilityReference abilities={abilities} />
            <BestiaryPanel
              enemies={enemies}
              onCreate={handleCreateEnemy}
              onUpdate={handleUpdateEnemy}
              onDelete={handleDeleteEnemy}
            />
          </div>
        </main>
      ) : null}
    </div>
  )
}

export default App
