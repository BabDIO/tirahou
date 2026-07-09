/**
 * useDebounce Hook - Debouncing pour recherches et inputs
 * ======================================================
 * 
 * Retarde l'exécution d'une valeur pour optimiser les performances
 * lors de la saisie utilisateur (recherche, filtres, etc.)
 * 
 * @module hooks/useDebounce
 */

import { useState, useEffect } from 'react'

/**
 * Hook pour debouncer une valeur
 * 
 * @param value - Valeur à debouncer
 * @param delay - Délai en millisecondes (défaut: 500ms)
 * @returns Valeur debouncée
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 500)
 * 
 * useEffect(() => {
 *   // API call avec debouncedSearch
 *   fetchResults(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Mettre à jour la valeur debouncée après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Nettoyer le timeout si value change avant la fin du délai
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
