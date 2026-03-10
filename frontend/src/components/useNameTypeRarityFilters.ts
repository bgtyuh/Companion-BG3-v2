import { useMemo, useState } from 'react'

interface NameTypeRarityItem {
  name: string
  type?: string | null
  rarity?: string | null
}

interface NameTypeRarityFilters<T extends NameTypeRarityItem> {
  search: string
  setSearch: (value: string) => void
  typeFilter: string
  setTypeFilter: (value: string) => void
  rarityFilter: string
  setRarityFilter: (value: string) => void
  filtered: T[]
  uniqueTypes: string[]
  uniqueRarities: string[]
}

export function useNameTypeRarityFilters<T extends NameTypeRarityItem>(
  items: readonly T[],
  limit = 40,
): NameTypeRarityFilters<T> {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase()
    return items
      .filter((item) => (typeFilter ? item.type === typeFilter : true))
      .filter((item) => (rarityFilter ? item.rarity === rarityFilter : true))
      .filter((item) => (lower ? item.name.toLowerCase().includes(lower) : true))
      .slice(0, limit)
  }, [items, search, typeFilter, rarityFilter, limit])

  const uniqueTypes = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.type)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [items],
  )

  const uniqueRarities = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.rarity)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [items],
  )

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    rarityFilter,
    setRarityFilter,
    filtered,
    uniqueTypes,
    uniqueRarities,
  }
}
