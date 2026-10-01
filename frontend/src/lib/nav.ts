/**
 * Active-link matching for links that carry a query string.
 *
 * React Router's `NavLink` compares the pathname only, so `/dashboard`,
 * `/dashboard?view=bookmarks` and `/dashboard?lang=rust` all report `isActive` at the
 * same time — which lights up the entire sidebar at once. These compare the search
 * string too, so exactly one link is ever current.
 */

/**
 * The query keys that distinguish one view of a page from another.
 *
 * They are mutually exclusive by design — see {@link setViewParam} — so at most one of
 * them is ever set, and comparing them pairwise is enough to identify a view.
 */
const VIEW_KEYS = ['view', 'lang', 'sort'] as const

/**
 * True when `to` names the same view as the current location.
 *
 * Every view key has to agree on both sides: `/dashboard?view=public` is current only
 * on that view, and a bare `/dashboard` only when no view key is set at all. Comparing
 * just the keys `to` mentions would leave the bare link lit alongside the specific one.
 */
export function isSameView(pathname: string, search: string, to: string): boolean {
  const [path, query = ''] = to.split('?')
  if (path !== pathname) return false

  const target = new URLSearchParams(query)
  const current = new URLSearchParams(search)

  for (const key of VIEW_KEYS) {
    if (target.get(key) !== current.get(key)) return false
  }
  return true
}

/**
 * The query string after one view key changes, with the other view keys cleared.
 *
 * Keeping these filters exclusive is what lets {@link isSameView} light exactly one
 * link: with `?lang=rust` and `?view=public` both set, no single link matches and the
 * nav would go dark. So picking a language drops the view filter and vice versa,
 * rather than applying both and quietly returning nothing.
 */
export function setViewParam(
  params: URLSearchParams,
  key: string,
  value: string | null,
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const other of VIEW_KEYS) next.delete(other)
  if (value !== null) next.set(key, value)
  return next
}