import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import './App.css'
import { api } from './api'
import type { Build, Enemy, LootItem } from './types'
import { AmuletPanel } from './components/AmuletPanel'
import { ArmouryPanel } from './components/ArmouryPanel'
import { BestiaryPanel } from './components/BestiaryPanel'
import { BuildLibrary } from './components/BuildLibrary'
import { CloakPanel } from './components/CloakPanel'
import { ClothingPanel } from './components/ClothingPanel'
import { LootChecklist } from './components/LootChecklist'
import { FootwearPanel } from './components/FootwearPanel'
import { HandwearPanel } from './components/HandwearPanel'
import { HeadwearPanel } from './components/HeadwearPanel'
import { PartyPlanner } from './components/PartyPlanner'
import { RingPanel } from './components/RingPanel'
import { SpellLibrary } from './components/SpellLibrary'
import { ShieldPanel } from './components/ShieldPanel'
import { WeaponPanel } from './components/WeaponPanel'

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function App() {
  const queryClient = useQueryClient()

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
  })
  const ringsQuery = useQuery({
    queryKey: ['rings'],
    queryFn: async () => sortByName(await api.getRings()),
  })
  const amuletsQuery = useQuery({
    queryKey: ['amulets'],
    queryFn: async () => sortByName(await api.getAmulets()),
  })
  const cloaksQuery = useQuery({
    queryKey: ['cloaks'],
    queryFn: async () => sortByName(await api.getCloaks()),
  })
  const clothingQuery = useQuery({
    queryKey: ['clothing'],
    queryFn: async () => sortByName(await api.getClothing()),
  })
  const footwearsQuery = useQuery({
    queryKey: ['footwears'],
    queryFn: async () => sortByName(await api.getFootwears()),
  })
  const handwearsQuery = useQuery({
    queryKey: ['handwears'],
    queryFn: async () => sortByName(await api.getHandwears()),
  })
  const headwearsQuery = useQuery({
    queryKey: ['headwears'],
    queryFn: async () => sortByName(await api.getHeadwears()),
  })
  const shieldsQuery = useQuery({
    queryKey: ['shields'],
    queryFn: async () => sortByName(await api.getShields()),
  })
  const weaponsQuery = useQuery({
    queryKey: ['weapons'],
    queryFn: async () => sortByName(await api.getWeapons()),
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

  const queries = [
    lootQuery,
    buildsQuery,
    enemiesQuery,
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
    spellsQuery,
    racesQuery,
    classesQuery,
  ] as const

  const isLoading = queries.some((query) => query.isPending)
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

  const weaponNames = useMemo(() => weapons.map((weapon) => weapon.name), [weapons])
  const armourNames = useMemo(() => armours.map((armour) => armour.name), [armours])

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
          </div>

          <div className="app__column app__column--wide">
            <PartyPlanner
              builds={builds}
              races={races}
              classes={classes}
              spells={spells}
              weaponOptions={weaponNames}
              armourOptions={armourNames}
            />
          </div>

          <div className="app__column">
            <BuildLibrary
              builds={builds}
              onCreate={handleCreateBuild}
              onUpdate={handleUpdateBuild}
              onDelete={handleDeleteBuild}
            />
            <ArmouryPanel armours={armours} />
            <ShieldPanel shields={shields} />
            <WeaponPanel weapons={weapons} />
            <ClothingPanel clothing={clothing} />
            <HeadwearPanel headwears={headwears} />
            <HandwearPanel handwears={handwears} />
            <FootwearPanel footwears={footwears} />
            <CloakPanel cloaks={cloaks} />
            <RingPanel rings={rings} />
            <AmuletPanel amulets={amulets} />
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
