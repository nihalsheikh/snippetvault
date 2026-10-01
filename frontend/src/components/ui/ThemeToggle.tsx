import { useTheme } from '@/hooks/useTheme'
import { cx } from '@/lib/format'

interface ThemeToggleProps {
  className?: string
  /** Render as a square icon-only button (used in the app bar). */
  compact?: boolean
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { isLight, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      onClick={(e) => {
        // The wipe expands from wherever the user actually clicked.
        // clientX/clientY are already viewport-relative, which is the space the
        // clip-path animation works in.
        toggleTheme({ x: e.clientX, y: e.clientY })
      }}
      className={cx(
        'flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-b2 bg-b1 px-3.5 py-[5px] font-mono text-[11px] text-t2 transition-all duration-200 hover:border-b3 hover:text-t1',
        className,
      )}
    >
      <span aria-hidden="true">{isLight ? '☾' : '☀'}</span>
      {compact ? null : <span>{isLight ? 'Dark' : 'Light'}</span>}
    </button>
  )
}