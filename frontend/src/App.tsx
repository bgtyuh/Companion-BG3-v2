import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import './App.css'
import { api } from './api'
import type { Build, Enemy, LootItem } from './types'
import { BestiaryPanel } from './components/BestiaryPanel'
import { BuildLibrary } from './components/BuildLibrary'
import { EquipmentTabs } from './components/EquipmentTabs'
import { LootChecklist } from './components/LootChecklist'
import { PartyPlanner } from './components/PartyPlanner'
import { SpellLibrary } from './components/SpellLibrary'

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

  const weaponNames = useMemo(() => weapons.map((weapon) => weapon.name), [weapons])
  const armourNames = useMemo(() => armours.map((armour) => armour.name), [armours])
  const shieldNames = useMemo(() => shields.map((shield) => shield.name), [shields])
  const headwearNames = useMemo(() => headwears.map((item) => item.name), [headwears])
  const handwearNames = useMemo(() => handwears.map((item) => item.name), [handwears])
  const footwearNames = useMemo(() => footwears.map((item) => item.name), [footwears])
  const cloakNames = useMemo(() => cloaks.map((item) => item.name), [cloaks])
  const amuletNames = useMemo(() => amulets.map((item) => item.name), [amulets])
  const ringNames = useMemo(() => rings.map((item) => item.name), [rings])
  const clothingNames = useMemo(() => clothing.map((item) => item.name), [clothing])

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
              shieldOptions={shieldNames}
              headwearOptions={headwearNames}
              handwearOptions={handwearNames}
              footwearOptions={footwearNames}
              cloakOptions={cloakNames}
              amuletOptions={amuletNames}
              ringOptions={ringNames}
              clothingOptions={clothingNames}
            />
          </div>

          <div className="app__column">
            <BuildLibrary
              builds={builds}
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
            />
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
