import { useState } from 'react'
import { cx } from '@/lib/format'

interface ToggleProps {
  defaultOn?: boolean
  label?: string
  description?: string
  onChange?: (next: boolean) => void
}

export function Toggle({ defaultOn = false, label, description, onChange }: ToggleProps) {
  const [on, setOn] = useState(defaultOn)

  const control = (
    <span
      role="switch"
      aria-checked={on}
      aria-label={label}
      tabIndex={0}
      onClick={() => {
        setOn((v) => !v)
        onChange?.(!on)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOn((v) => !v)
          onChange?.(!on)
        }
      }}
      className={cx(
        'relative h-[22px] w-10 shrink-0 cursor-pointer rounded-[11px] border transition-colors duration-200',
        'after:absolute after:left-[3px] after:top-[3px] after:h-[14px] after:w-[14px] after:rounded-full after:transition-all after:duration-200',
        on
          ? 'border-[color-mix(in_srgb,var(--lime)_40%,transparent)] bg-[color-mix(in_srgb,var(--lime)_25%,transparent)] after:left-[21px] after:bg-lime'
          : 'border-b2 bg-b1 after:bg-t3',
      )}
    />
  )

  if (!label) return control

  return (
    <div className="flex items-center justify-between border-b border-b1 py-3 last:border-b-0">
      <div>
        <div className="mb-0.5 text-[13px] font-medium text-t1">{label}</div>
        {description ? <div className="text-[12px] text-t3">{description}</div> : null}
      </div>
      {control}
    </div>
  )
}