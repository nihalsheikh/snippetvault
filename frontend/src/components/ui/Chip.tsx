import type { ReactNode } from 'react'
import { cx } from '@/lib/format'

interface ChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

/** Pill filter used on the dashboard and in the community library. */
export function FilterChip({ children, active, onClick, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'cursor-pointer rounded-full border px-3 py-[5px] font-mono text-[12px] transition-all duration-150',
        active
          ? 'border-[color-mix(in_srgb,var(--lime)_30%,transparent)] bg-[color-mix(in_srgb,var(--lime)_8%,transparent)] text-lime'
          : 'border-b1 bg-s2 text-t2 hover:border-b2 hover:text-t1',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Small static label, e.g. a tag on a snippet card. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'rounded-[4px] bg-b1 px-[7px] py-0.5 font-mono text-[10px] text-t3',
        className,
      )}
    >
      {children}
    </span>
  )
}