/** 1284 → "1,284" */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

/** "2d ago" from an ISO date, matching the design's relative timestamps. */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime()
  const seconds = Math.round((now.getTime() - then) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

/** "14 Mar 2025" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * The handle to show for an account.
 *
 * Falls back to the email's local part, sanitized the same way the backend does it —
 * `john.smith+dev@gmail.com` has to read as `john.smith_dev`, not as the raw string,
 * and the address itself must never reach the UI. Accounts created before signup
 * started writing handles are the reason this path exists at all.
 */
export function usernameOf(p: { username: string | null; email: string }): string {
  const claimed = p.username?.trim()
  if (claimed) return claimed

  const local = sanitizeHandle(p.email.split('@')[0] ?? '')
  return local || `user-${stableHash(p.email).toString(36)}`
}

/** Mirrors `backend/utils/username.py::sanitize_username`. */
function sanitizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]+/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '')
    .slice(0, 30)
}

/** A small stable hash, so the same address always yields the same fallback. */
function stableHash(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash
}

/** Deterministic gradient so an author always gets the same avatar colour. */
export function avatarGradient(seed: string): string {
  const palettes = [
    'linear-gradient(135deg, var(--lime), var(--cyan))',
    'linear-gradient(135deg, var(--purple), var(--pink))',
    'linear-gradient(135deg, var(--cyan), var(--lime))',
    'linear-gradient(135deg, var(--orange), var(--yellow))',
    'linear-gradient(135deg, var(--pink), var(--purple))',
  ]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return palettes[hash % palettes.length]
}

export function countLines(code: string): number {
  return code.split('\n').length
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}