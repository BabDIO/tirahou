/**
 * useLocalStorage Hook - Persistance dans localStorage
 * ===================================================
 * 
 * Hook pour synchroniser un état React avec localStorage
 * avec gestion d'erreurs et typage TypeScript.
 * 
 * @module hooks/useLocalStorage
 */

import { useState, useEffect } from 'react'

/**
 * Hook pour stocker et récupérer des données du localStorage
 * 
 * @param key - Clé du localStorage
 * @param initialValue - Valeur initiale par défaut
 * @returns [valeur, setter] - Similaire à useState
 * 
 * @example
 * const [user, setUser] = useLocalStorage('user', null)
 * setUser({ name: 'John', email: 'john@example.com' })
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // Récupérer depuis localStorage à l'initialisation
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Mettre à jour localStorage quand la valeur change
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permettre value d'être une fonction comme useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      setStoredValue(valueToStore)
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}

export default useLocalStorage
