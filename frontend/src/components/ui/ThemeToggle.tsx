import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cx } from '@/lib/format'

/** Icon-only switch. The sun/moon glyph states the action, so no label. */
export function ThemeToggle({ className }: { className?: string }) {
  const { isLight, toggleTheme } = useTheme()
  const Icon = isLight ? Moon : Sun

  return (
    <button
      type="button"
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      title={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      onClick={(e) => {
        // The wipe expands from wherever the user actually clicked.
        // clientX/clientY are already viewport-relative, which is the space the
        // clip-path animation works in.
        toggleTheme({ x: e.clientX, y: e.clientY })
      }}
      className={cx(
        'flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-r2)] border border-b2 text-t2 transition-all duration-200 hover:border-b3 hover:bg-b1 hover:text-t1',
        className,
      )}
    >
      <Icon size={16} />
    </button>
  )
}
