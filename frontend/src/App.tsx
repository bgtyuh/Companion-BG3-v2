import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { api } from './api'
import type {
  ArmourItem,
  Build,
  Enemy,
  LootItem,
  Race,
  CharacterClass,
  Spell,
  WeaponItem,
} from './types'
import { ArmouryPanel } from './components/ArmouryPanel'
import { BestiaryPanel } from './components/BestiaryPanel'
import { BuildLibrary } from './components/BuildLibrary'
import { LootChecklist } from './components/LootChecklist'
import { PartyPlanner } from './components/PartyPlanner'
import { SpellLibrary } from './components/SpellLibrary'
import { WeaponPanel } from './components/WeaponPanel'

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function App() {
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [builds, setBuilds] = useState<Build[]>([])
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [armours, setArmours] = useState<ArmourItem[]>([])
  const [weapons, setWeapons] = useState<WeaponItem[]>([])
  const [spells, setSpells] = useState<Spell[]>([])
  const [races, setRaces] = useState<Race[]>([])
  const [classes, setClasses] = useState<CharacterClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const [loot, buildData, enemyData, armourData, weaponData, spellData, raceData, classData] = await Promise.all([
          api.getLootItems(),
          api.getBuilds(),
          api.getEnemies(),
          api.getArmours(),
          api.getWeapons(),
          api.getSpells(),
          api.getRaces(),
          api.getClasses(),
        ])
        setLootItems(sortByName(loot))
        setBuilds(sortByName(buildData))
        setEnemies(sortByName(enemyData))
        setArmours(sortByName(armourData))
        setWeapons(sortByName(weaponData))
        setSpells(sortByName(spellData))
        setRaces(sortByName(raceData))
        setClasses(sortByName(classData))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Impossible de charger les données.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  async function handleCreateLoot(payload: { name: string; type?: string; region?: string; description?: string }) {
    const created = await api.createLootItem({ ...payload, is_collected: false })
    setLootItems((items) => sortByName([...items, created]))
  }

  async function handleToggleLoot(item: LootItem) {
    const updated = await api.updateLootItem(item.id, { is_collected: !item.is_collected })
    setLootItems((items) => items.map((entry) => (entry.id === item.id ? updated : entry)))
  }

  async function handleDeleteLoot(item: LootItem) {
    await api.deleteLootItem(item.id)
    setLootItems((items) => items.filter((entry) => entry.id !== item.id))
  }

  async function handleCreateBuild(build: Omit<Build, 'id'>) {
    const created = await api.createBuild(build)
    setBuilds((items) => sortByName([...items, created]))
  }

  async function handleUpdateBuild(id: number, build: Omit<Build, 'id'>) {
    const updated = await api.updateBuild(id, build)
    setBuilds((items) => sortByName(items.map((entry) => (entry.id === id ? updated : entry))))
  }

  async function handleDeleteBuild(id: number) {
    await api.deleteBuild(id)
    setBuilds((items) => items.filter((entry) => entry.id !== id))
  }

  async function handleCreateEnemy(enemy: Omit<Enemy, 'id'>) {
    const created = await api.createEnemy(enemy)
    setEnemies((items) => sortByName([...items, created]))
  }

  async function handleUpdateEnemy(id: number, enemy: Omit<Enemy, 'id'>) {
    const updated = await api.updateEnemy(id, enemy)
    setEnemies((items) => sortByName(items.map((entry) => (entry.id === id ? updated : entry))))
  }

  async function handleDeleteEnemy(id: number) {
    await api.deleteEnemy(id)
    setEnemies((items) => items.filter((entry) => entry.id !== id))
  }

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
            <WeaponPanel weapons={weapons} />
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
