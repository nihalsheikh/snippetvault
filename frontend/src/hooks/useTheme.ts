import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'sv-theme'

export type Theme = 'dark' | 'light'

function currentTheme(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

/**
 * Whether the browser can animate the theme change. Safari and any browser without
 * the View Transitions API falls back to an instant swap.
 */
function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document
}

/**
 * Circular wipe that reveals the new theme from the toggle's position.
 *
 * The page's own CSS transitions are suppressed for the duration so the old and
 * new snapshots stay static; without this the snapshot cross-fade fights the
 * clip animation and you get a muddy double-wipe.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(currentTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeState(currentTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const applyTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle('light', next === 'light')
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [])

  const setTheme = useCallback(
    (next: Theme, origin?: { x: number; y: number }) => {
      const root = document.documentElement

      if (!supportsViewTransitions() || !origin) {
        applyTheme(next)
        return
      }

      const { x, y } = origin
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

      const transition = document.startViewTransition(() => applyTheme(next))

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 500,
            easing: 'ease-in-out',
            // Draws the new theme over the old one, anchored at the toggle.
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
    },
    [applyTheme],
  )

  const toggleTheme = useCallback(
    (origin?: { x: number; y: number }) => {
      setTheme(currentTheme() === 'light' ? 'dark' : 'light', origin)
    },
    [setTheme],
  )

  return { theme, isLight: theme === 'light', setTheme, toggleTheme }
}