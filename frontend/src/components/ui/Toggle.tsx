import { useState } from 'react'
import { cx } from '@/lib/format'

interface ToggleProps {
  defaultOn?: boolean
  label?: string
  description?: string
  onChange?: (next: boolean) => void
}

/**
 * Switch control.
 *
 * The track is 20px tall with a 16px knob inset by 2px on each side, so the knob
 * always sits inside the rounded track in both states. The previous version positioned
 * a pseudo-element at `left:21px`, which put its right edge at 35px of a 40px track
 * and let it poke past the curve.
 */
export function Toggle({ defaultOn = false, label, description, onChange }: ToggleProps) {
  const [on, setOn] = useState(defaultOn)

  // One place decides the next value, so `onChange` reports the value the switch
  // actually moved to rather than the one it was already on.
  function flip() {
    const next = !on
    setOn(next)
    onChange?.(next)
  }

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={flip}
      className={cx(
        'relative h-[20px] w-[38px] shrink-0 cursor-pointer rounded-[10px] border transition-colors duration-200',
        on
          ? 'border-[color-mix(in_srgb,var(--lime)_40%,transparent)] bg-[color-mix(in_srgb,var(--lime)_25%,transparent)]'
          : 'border-b2 bg-b1',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-[1px] h-[16px] w-[16px] rounded-full transition-all duration-200',
          on ? 'left-[20px] bg-lime' : 'left-[1px] bg-t3',
        )}
      />
    </button>
  )

  if (!label) return control

  return (
    <div className="flex items-center justify-between gap-4 border-b border-b1 py-3 last:border-b-0">
      <div className="min-w-0">
        <div className="mb-0.5 text-[13px] font-medium text-t1">{label}</div>
        {description ? <div className="text-[12px] text-t3">{description}</div> : null}
      </div>
      {control}
    </div>
  )
}
