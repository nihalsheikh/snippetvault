import type { Language } from '@/lib/types'
import { languageMeta } from '@/lib/languages'
import { cx } from '@/lib/format'

/** Pill badge naming a language, coloured per the design. */
export function LanguageBadge({
  language,
  short = false,
  className,
}: {
  language: Language
  short?: boolean
  className?: string
}) {
  const meta = languageMeta(language)
  return (
    <span
      className={cx(
        'rounded-[4px] px-[7px] py-0.5 font-mono text-[10px] font-semibold',
        className,
      )}
      style={{ background: meta.softBg, color: meta.color }}
    >
      {short ? meta.short : meta.label}
    </span>
  )
}

/** Bare coloured dot used in list rows and editor tabs. */
export function LanguageDot({ language, className }: { language: Language; className?: string }) {
  return (
    <span
      className={cx('block h-2 w-2 shrink-0 rounded-full', className)}
      style={{ background: languageMeta(language).color }}
    />
  )
}