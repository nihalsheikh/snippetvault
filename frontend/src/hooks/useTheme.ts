import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'sv-theme'

export type Theme = 'dark' | 'light'

function currentTheme(): Theme {
  return document.documentElement.classList.contains('light') ? 'light' : 'dark'
}

/**
 * Circular wipe that reveals the new theme from the toggle's position.
 *
 * The default cross-fade on the snapshots is disabled in theme.css so only the
 * clip-path animation runs; otherwise the two blend and the wipe looks muddy.
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
      const start = document.startViewTransition?.bind(document)

      if (!start || !origin) {
        applyTheme(next)
        return
      }

      const { x, y } = origin
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

      const transition = start(() => applyTheme(next))

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