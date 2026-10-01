import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '@/lib/format'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'lime-soft'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-lime text-[var(--on-lime)] font-bold hover:bg-[var(--lime-hover)]',
  ghost: 'bg-transparent text-t1 border border-b2 hover:border-b3 hover:bg-b1 font-medium',
  outline: 'bg-transparent text-t1 border border-b2 hover:border-b3 hover:bg-b1',
  danger: 'bg-transparent text-red border border-[color-mix(in_srgb,var(--red)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--red)_8%,transparent)]',
  'lime-soft':
    'bg-[color-mix(in_srgb,var(--lime)_8%,transparent)] border border-[color-mix(in_srgb,var(--lime)_25%,transparent)] text-lime hover:bg-[color-mix(in_srgb,var(--lime)_16%,transparent)] font-mono',
}

const SIZES: Record<Size, string> = {
  sm: 'text-[12px] px-4 py-2 rounded-[var(--radius-r2)]',
  md: 'text-[13px] px-4 py-2.5 rounded-[var(--radius-r2)]',
  lg: 'text-[14px] px-7 py-[13px] rounded-[var(--radius-r2)]',
}

interface BaseProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

function classes({ variant = 'primary', size = 'md', className }: BaseProps) {
  return cx(
    'inline-flex cursor-pointer items-center justify-center whitespace-nowrap border transition-all duration-200',
    'hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export function Button({
  variant,
  size,
  className,
  children,
  ...rest
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes({ variant, size, className, children })} {...rest}>
      {children}
    </button>
  )
}

export function ButtonLink({
  to,
  variant,
  size,
  className,
  children,
}: BaseProps & { to: string }) {
  return (
    <Link to={to} className={classes({ variant, size, className, children })}>
      {children}
    </Link>
  )
}