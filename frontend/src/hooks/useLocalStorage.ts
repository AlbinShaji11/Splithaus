import { useState } from 'react'

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  function setValue(value: T) {
    try {
      setStored(value)
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // silently ignore write errors (e.g. private mode)
    }
  }

  return [stored, setValue]
}
