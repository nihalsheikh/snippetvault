import { useEffect, useState } from 'react'

/**
 * Debounce any value by a given delay.
 * Useful for search inputs, API calls on keystroke.
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}