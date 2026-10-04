/**
 * Dot-matrix loading indicator.
 *
 * A 5×5 grid whose rows light bottom-up and then release together — the
 * "compile" pattern. It replaces the `animate-pulse` text placeholders that
 * were scattered across the loading states, so every wait in the app reads the
 * same way.
 *
 * The grid is plain SVG with one CSS animation per row and no runtime: the
 * per-row offsets are static, so React renders it once and the browser does the
 * rest. `prefers-reduced-motion` is handled globally in `theme.css`, which
 * clamps every animation to a single frame.
 */

import type { CSSProperties } from 'react'

const GRID = 5
/** One full cycle. Rows are staggered inside this window, never across it. */
const PERIOD_S = 1.6
/** Delay between one row starting and the row below it. */
const RISE_STEP_S = 0.09

/**
 * Default edge length in px. A 5×5 grid of dots at 28px puts each dot under 6px
 * across on a high-DPI screen, which reads as a smudge rather than as motion — the
 * animation is the only thing telling you the page is working. 88 gives the grid
 * room to be seen and makes the wait legible from across a desk.
 */
const DEFAULT_SIZE = 88

export function Loader({
  size = DEFAULT_SIZE,
  className,
  label = 'Loading',
}: {
  size?: number
  className?: string
  /** Announced to screen readers; the grid itself is decorative. */
  label?: string
}) {
  // The viewBox is a fixed 100-unit square and the grid is drawn as a fraction
  // of it, so any `size` renders the same proportions without re-deriving px.
  const dot = 6.2
  const gap = 3.1
  const span = GRID * dot + (GRID - 1) * gap
  const pad = (100 - span) / 2

  return (
    <span
      role="status"
      aria-label={label}
      className={className}
      style={{ width: size, height: size, display: 'inline-block' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        {Array.from({ length: GRID }, (_, row) => (
          <g
            key={row}
            style={
              {
                // Row 0 is the top of the grid, but the fill rises from the
                // bottom, so the delay counts down as the row index grows.
                animation: `sv-dot-compile ${PERIOD_S}s ease-in-out ${
                  (GRID - 1 - row) * RISE_STEP_S
                }s infinite`,
              } as CSSProperties
            }
          >
            {Array.from({ length: GRID }, (_, col) => (
              <circle
                key={col}
                cx={pad + col * (dot + gap) + dot / 2}
                cy={pad + row * (dot + gap) + dot / 2}
                r={dot / 2}
                fill="currentColor"
              />
            ))}
          </g>
        ))}
      </svg>
    </span>
  )
}

/**
 * The centred "wait" state for a page or a route guard. `label` names the cause,
 * so it is announced and shown — the grid on its own would be unreadable.
 */
export function LoaderPanel({
  label = 'Loading',
  className = 'min-h-[50vh]',
  size = DEFAULT_SIZE,
}: {
  label?: string
  className?: string
  size?: number
}) {
  return (
    // `w-full` alongside the centring: without an explicit width the flex container
    // is only as wide as the grid inside it, so `justify-center` centres the loader
    // within ~88px of itself and it sits at the far left of the page.
    <div
      className={`flex w-full items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-4 text-t3">
        <Loader size={size} className="text-lime" label={label} />
        <span className="font-mono text-[11px] tracking-[0.5px]">{label}…</span>
      </div>
    </div>
  )
}