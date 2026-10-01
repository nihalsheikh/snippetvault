import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/format'

const FIELD =
  'w-full bg-s2 border border-b1 rounded-[var(--radius-r1)] px-3.5 py-2.5 text-[14px] text-t1 font-sans outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_40%,transparent)]'

interface FieldProps {
  label: string
  hint?: ReactNode
  className?: string
}

export function Input({
  label,
  hint,
  className,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx('mb-4', className)}>
      <label className="mb-1.5 block text-[12px] font-medium tracking-[0.3px] text-t2">{label}</label>
      <input className={FIELD} {...rest} />
      {hint ? <div className="mt-1.5 text-[11px] text-t3">{hint}</div> : null}
    </div>
  )
}

export function Textarea({
  label,
  hint,
  className,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={cx('mb-4', className)}>
      <label className="mb-1.5 block text-[12px] font-medium tracking-[0.3px] text-t2">{label}</label>
      <textarea className={cx(FIELD, 'resize-none leading-relaxed')} {...rest} />
      {hint ? <div className="mt-1.5 text-[11px] text-t3">{hint}</div> : null}
    </div>
  )
}