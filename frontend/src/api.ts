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

const FALLBACK_DEV_PORTS = new Set(['5173', '4173'])
const DEFAULT_DEV_API_PORT = '8000'

// Lorsque l'application tourne via le serveur de développement ou l'aperçu Vite,
// le front est servi respectivement sur les ports 5173 et 4173. Si l'URL de
// l'API n'est pas configurée explicitement, nous essayons automatiquement le
// même hôte sur le port 8000 pour faciliter la configuration locale.

function resolveApiBaseUrl(): string {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (typeof envBaseUrl === 'string' && envBaseUrl.trim().length > 0) {
    return envBaseUrl.trim()
  }

  if (typeof window === 'undefined') {
    return ''
  }

  const { href, origin, protocol, host } = window.location

  try {
    const currentUrl = new URL(href)
    if (currentUrl.port && FALLBACK_DEV_PORTS.has(currentUrl.port)) {
      currentUrl.port = DEFAULT_DEV_API_PORT
      currentUrl.pathname = ''
      currentUrl.search = ''
      currentUrl.hash = ''
      return currentUrl.origin
    }
  } catch {
    // ignore parsing issues and fall back to the origin below
  }

  if (origin) {
    return origin
  }

  return `${protocol}//${host}`
}

const rawBaseUrl = resolveApiBaseUrl()
const API_BASE_URL = rawBaseUrl.replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Impossible de contacter l'API. Vérifiez que le serveur est accessible et que VITE_API_BASE_URL est correctement configurée.",
      )
    }
    throw error
  }

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    // @ts-expect-error intentionally returning undefined for no-content responses
    return undefined
  }

  const responseClone = response.clone()
  const contentType = response.headers.get('content-type') ?? ''
  const normalizedContentType = contentType.toLowerCase()

  if (!normalizedContentType.includes('application/json')) {
    const rawBody = (await responseClone.text()).trim()
    const snippet = rawBody.replace(/\s+/g, ' ').slice(0, 200)
    const isLikelyHtml =
      normalizedContentType.includes('text/html') || /^<!doctype html/i.test(rawBody) || /^<html/i.test(rawBody)

    if (isLikelyHtml) {
      throw new Error(
        snippet
          ? `Réponse inattendue du serveur : du HTML a été reçu. Vérifiez que VITE_API_BASE_URL pointe vers l'API et que le serveur backend est démarré. Aperçu : ${snippet}`
          : `Réponse inattendue du serveur : du HTML a été reçu. Vérifiez que VITE_API_BASE_URL pointe vers l'API et que le serveur backend est démarré.`,
      )
    }
    throw new Error(
      rawBody
        ? `Réponse inattendue du serveur (type ${contentType || 'inconnu'}). Vérifiez que l'API renvoie du JSON valide. Aperçu : ${snippet}`
        : `Réponse inattendue du serveur (type ${contentType || 'inconnu'}). Vérifiez que l'API renvoie du JSON valide.`,
    )
  }

  try {
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof SyntaxError) {
      let snippet = ''
      try {
        const rawBody = (await responseClone.text()).trim()
        snippet = rawBody.slice(0, 200)
      } catch {
        // ignore read errors when building the debug message
      }
      throw new Error(
        snippet
          ? `Impossible de décoder la réponse JSON du serveur. Vérifiez que l'API renvoie du JSON valide. Aperçu : ${snippet}`
          : "Impossible de décoder la réponse JSON du serveur. Vérifiez que l'API renvoie du JSON valide.",
      )
    }
    throw error
  }
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
