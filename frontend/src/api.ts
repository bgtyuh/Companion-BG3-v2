import type {
  ArmourItem,
  AmuletItem,
  Build,
  BuildLevel,
  CloakItem,
  ClothingItem,
  Enemy,
  FootwearItem,
  HandwearItem,
  HeadwearItem,
  LootItem,
  RingItem,
  Race,
  CharacterClass,
  ShieldItem,
  Spell,
  WeaponItem,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    // @ts-expect-error intentionally returning undefined for no-content responses
    return undefined
  }

  return (await response.json()) as T
}

export const api = {
  getLootItems: () => request<LootItem[]>('/api/loot'),
  createLootItem: (payload: Partial<LootItem>) =>
    request<LootItem>('/api/loot', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLootItem: (id: number, payload: Partial<LootItem>) =>
    request<LootItem>(`/api/loot/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteLootItem: (id: number) =>
    request<void>(`/api/loot/${id}`, { method: 'DELETE' }),

  getBuilds: () => request<Build[]>('/api/builds'),
  createBuild: (payload: Omit<Build, 'id'>) =>
    request<Build>('/api/builds', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateBuild: (id: number, payload: Omit<Build, 'id'>) =>
    request<Build>(`/api/builds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteBuild: (id: number) =>
    request<void>(`/api/builds/${id}`, { method: 'DELETE' }),

  getEnemies: () => request<Enemy[]>('/api/bestiary'),
  createEnemy: (payload: Partial<Enemy>) =>
    request<Enemy>('/api/bestiary', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateEnemy: (id: number, payload: Partial<Enemy>) =>
    request<Enemy>(`/api/bestiary/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteEnemy: (id: number) =>
    request<void>(`/api/bestiary/${id}`, { method: 'DELETE' }),

  getArmours: () => request<ArmourItem[]>('/api/armours'),
  getRings: () => request<RingItem[]>('/api/rings'),
  getAmulets: () => request<AmuletItem[]>('/api/amulets'),
  getCloaks: () => request<CloakItem[]>('/api/cloaks'),
  getClothing: () => request<ClothingItem[]>('/api/clothing'),
  getFootwears: () => request<FootwearItem[]>('/api/footwears'),
  getHandwears: () => request<HandwearItem[]>('/api/handwears'),
  getHeadwears: () => request<HeadwearItem[]>('/api/headwears'),
  getShields: () => request<ShieldItem[]>('/api/shields'),
  getWeapons: () => request<WeaponItem[]>('/api/weapons'),
  getSpells: () => request<Spell[]>('/api/spells'),
  getRaces: () => request<Race[]>('/api/races'),
  getClasses: () => request<CharacterClass[]>('/api/classes'),
}

export type {
  ArmourItem,
  AmuletItem,
  Build,
  BuildLevel,
  CloakItem,
  ClothingItem,
  Enemy,
  FootwearItem,
  HandwearItem,
  HeadwearItem,
  LootItem,
  RingItem,
  Race,
  CharacterClass,
  ShieldItem,
  Spell,
  WeaponItem,
}
