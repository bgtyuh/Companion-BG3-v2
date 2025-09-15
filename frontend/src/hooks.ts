import { useEffect, useState } from 'react'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored) as T
      }
    } catch (error) {
      console.warn('Failed to read from localStorage', error)
    }
    return defaultValue
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to write to localStorage', error)
    }
  }, [key, value])

  return [value, setValue] as const
}
