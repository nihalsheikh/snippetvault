import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Pencil, X } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { LoaderPanel } from '@/components/ui/Loader'
import { Toggle } from '@/components/ui/Toggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { authApi, messageOf, snippetsApi } from '@/lib/api'
import { toSnippets } from '@/lib/mappers'
import { avatarGradient, cx, formatNumber, initialsOf } from '@/lib/format'
import type { Author, Snippet } from '@/lib/types'

const TABS = ['Profile', 'Account', 'Appearance', 'API Keys', 'Notifications', 'Danger Zone']

/** A Free-plan library fits in one page, so the totals below cover everything. */
const SCAN_LIMIT = 100

export function ProfilePage() {
  // The Profile and Account tabs call `useAuth()` themselves for the form actions;
  // this level only needs the identity and the two destructive ones.
  const { profile, deleteAccount, logout } = useAuth()

  const [tab, setTab] = useState('Profile')
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await snippetsApi.mine({ limit: SCAN_LIMIT })
        if (cancelled) return
        setSnippets(toSnippets(result.items))
        setTotal(result.total)
      } catch (err) {
        if (!cancelled) setError(messageOf(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!profile) {
    return <LoaderPanel label="Loading profile" />
  }

  const author: Author = {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    initials: initialsOf(profile.name) || initialsOf(profile.username) || '?',
    avatarGradient: avatarGradient(profile.id),
    profileImage: profile.profileImage,
  }

  const copies = snippets.reduce((sum, s) => sum + s.copies, 0)
  const bestCopies = Math.max(0, ...snippets.map((s) => s.copies))
  // Every saved snippet carries its explanation, so the count is exact — the only
  // thing the mock version had to invent.
  const explained = snippets.filter((s) => s.aiExplanation).length

  return (
    <div className="mx-auto max-w-[820px] px-6 py-9">
      {/* ---------- cover + identity ----------
          Plain document flow. This used to pull an 80px avatar up over the cover with
          a negative margin, which collided with the name column at narrow widths. */}
      <div className="h-32 rounded-[var(--radius-r3)] border border-b1 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--lime)_8%,transparent),color-mix(in_srgb,var(--purple)_8%,transparent))]" />

      <div className="mb-7 mt-5 flex items-center gap-5 max-sm:flex-col max-sm:items-start">
        <div className="relative shrink-0">
          <Avatar author={author} size="xl" className="border-[3px] border-bg" />
          {/* Avatars are generated from the account id — there is no upload endpoint,
              so this stays visible but inert rather than pretending to work. */}
          <span
            className="absolute -bottom-1 -right-1 flex h-[24px] w-[24px] items-center justify-center rounded-full border-2 border-s1 bg-s3 text-t4"
            title="Avatars are generated from your account"
          >
            <Camera size={11} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="mb-0.5 truncate font-serif text-[24px] tracking-[-0.5px]">
            {profile.name}
          </h1>
          <div className="mb-2 truncate font-mono text-[13px] text-t3">
            @{author.username}
            {profile.website ? ` · ${profile.website}` : ''}
          </div>
          {profile.bio ? <p className="text-[13px] leading-[1.6] text-t2">{profile.bio}</p> : null}
        </div>
        <div className="shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setTab('Profile')}>
            Edit profile
          </Button>
        </div>
      </div>

      {/* ---------- stats ---------- */}
      <div className="mb-8 grid grid-cols-4 gap-3 max-md:grid-cols-2">
        <ProfileStat value={formatNumber(total)} label="Snippets" color="var(--lime)" />
        <ProfileStat value={formatNumber(copies)} label="Total copies" color="var(--t1)" />
        <ProfileStat value={formatNumber(explained)} label="AI explains" color="var(--purple)" />
        {/* "AI explains" counts stored explanations; the model behind them is never
            named in the UI. */}
        <ProfileStat value={formatNumber(bestCopies)} label="Best snippet copies" color="var(--t1)" />
      </div>

      {/* ---------- tabs ---------- */}
      <div className="sv-scroll-x mb-7 flex border-b border-b1 max-md:text-[11px]">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={cx(
              'shrink-0 cursor-pointer whitespace-nowrap border-b-2 border-transparent bg-transparent px-[18px] py-2.5 font-mono text-[12px] transition-colors duration-150',
              tab === name
                ? name === 'Danger Zone'
                  ? 'border-b-red text-red'
                  : 'border-b-lime text-lime'
                : 'text-t2 hover:text-t1',
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mb-5 text-[12px] text-t3">
          {error}
        </p>
      ) : null}

      {tab === 'Profile' ? <ProfileTab key={profile.id} /> : null}
      {tab === 'Account' ? <AccountTab onLogout={logout} /> : null}
      {tab === 'Appearance' ? (
        <section>
          <h2 className="mb-1 text-[14px] font-semibold">Appearance</h2>
          <p className="mb-4 text-[12px] text-t3">
            SnippetVault follows your system setting by default.
          </p>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="mb-0.5 text-[13px] font-medium">Theme</div>
              <div className="text-[12px] text-t3">Dark or light</div>
            </div>
            <ThemeToggle />
          </div>
        </section>
      ) : null}
      {tab === 'Danger Zone' ? (
        <DangerTab
          onDelete={deleteAccount}
          snippetCount={total}
          snippets={snippets}
        />
      ) : null}
      {tab === 'API Keys' || tab === 'Notifications' ? (
        <PlaceholderPanel tab={tab} />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

/** `key={profile.id}` remounts this when the saved profile changes, so the fields
 *  below re-seed from the server's version rather than keeping stale edits. */
function ProfileTab() {
  const { profile, patchProfile } = useAuth()
  const [name, setName] = useState(profile?.name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [website, setWebsite] = useState(profile?.website ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setState('saving')
    setError(null)
    try {
      // Only changed fields are sent — the backend applies `exclude_unset`, so an
      // untouched field is left alone rather than overwritten with a blank.
      await patchProfile({ name, username, website, bio })
      setState('saved')
      window.setTimeout(() => setState('idle'), 1800)
    } catch (err) {
      setError(messageOf(err))
      setState('error')
    }
  }

  return (
    <>
      <section className="mb-7">
        <h2 className="mb-1 text-[14px] font-semibold">Public profile</h2>
        <p className="mb-4 text-[12px] text-t3">
          This information is visible to anyone who visits your profile.
        </p>
        <div className="mb-3.5 grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
          <Field label="Display name" value={name} onChange={setName} maxLength={50} />
          <Field
            label="Username"
            value={username}
            onChange={setUsername}
            maxLength={30}
            placeholder="choose a handle"
          />
        </div>
        <div className="mb-3.5 flex flex-col gap-[5px]">
          <label className="font-mono text-[11px] font-medium tracking-[0.3px] text-t2">
            Website
          </label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={255}
            placeholder="https://example.dev"
            className={INPUT}
          />
        </div>
        <div className="mb-3.5 flex flex-col gap-[5px]">
          <label className="font-mono text-[11px] font-medium tracking-[0.3px] text-t2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What are you building?"
            className={cx(INPUT, 'resize-none leading-[1.6]')}
          />
        </div>
        {error ? (
          <p role="alert" className="mb-3 text-[12px] text-t3">
            {error}
          </p>
        ) : null}
      </section>

      <section className="mb-7 border-t border-b1 pt-6">
        <h2 className="mb-2 text-[14px] font-semibold">Preferences</h2>
        <p className="mb-2 text-[12px] text-t3">
          These are not wired to the backend yet — the switches hold their state for this session only.
        </p>
        <Toggle defaultOn label="Default snippet visibility" description="New snippets are public by default" />
        <Toggle defaultOn label="AI auto-tagging" description="Automatically suggest tags when you paste code" />
        <Toggle label="AI auto-explanation" description="Generate explanation when saving a new snippet" />
        <Toggle label="Copy notifications" description="Email me when someone copies my public snippet" />
      </section>

      <div className="flex justify-end pb-2">
        <Button size="lg" onClick={() => void save()} disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved ✓' : 'Save changes →'}
        </Button>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Account tab
// ---------------------------------------------------------------------------

function AccountTab({ onLogout }: { onLogout: () => Promise<void> }) {
  const { profile, changePassword } = useAuth()

  const [newEmail, setNewEmail] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'saving' | 'sent' | 'error'>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [pwError, setPwError] = useState<string | null>(null)

  async function submitEmail() {
    setEmailState('saving')
    setEmailError(null)
    try {
      // The change only lands once the emailed confirmation link is opened, so the
      // success copy says so rather than implying it's already applied.
      await authApi.changeEmail(newEmail)
      setEmailState('sent')
      setNewEmail('')
    } catch (err) {
      setEmailError(messageOf(err))
      setEmailState('error')
    }
  }

  async function submitPassword() {
    setPwState('saving')
    setPwError(null)
    try {
      await changePassword({
        current_password: current,
        new_password: next,
        confirm_new_password: confirm,
      })
      setPwState('saved')
      setCurrent('')
      setNext('')
      setConfirm('')
      window.setTimeout(() => setPwState('idle'), 1800)
    } catch (err) {
      setPwError(messageOf(err))
      setPwState('error')
    }
  }

  return (
    <>
      <section className="mb-7">
        <h2 className="mb-1 text-[14px] font-semibold">Email address</h2>
        <p className="mb-4 text-[12px] text-t3">
          Current: <span className="text-t2">{profile?.email}</span>{' '}
          {profile?.emailVerified ? (
            <span className="text-lime">· verified</span>
          ) : (
            <span className="text-t3">· not verified</span>
          )}
        </p>
        <div className="flex gap-2.5">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            aria-label="New email address"
            className={INPUT}
          />
          <Button variant="ghost" onClick={() => void submitEmail()} disabled={!newEmail || emailState === 'saving'}>
            {emailState === 'saving' ? 'Sending…' : 'Change'}
          </Button>
        </div>
        {emailState === 'sent' ? (
          <p className="mt-2 text-[12px] text-t2">
            Confirmation link sent. The address changes once you open it.
          </p>
        ) : null}
        {emailError ? (
          <p role="alert" className="mt-2 text-[12px] text-t3">
            {emailError}
          </p>
        ) : null}
      </section>

      <section className="mb-7 border-t border-b1 pt-6">
        <h2 className="mb-1 text-[14px] font-semibold">Password</h2>
        <p className="mb-4 text-[12px] text-t3">At least 6 characters.</p>
        <div className="mb-3.5 flex flex-col gap-[5px]">
          <label className="font-mono text-[11px] font-medium tracking-[0.3px] text-t2">
            Current password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={INPUT}
          />
        </div>
        <div className="mb-3.5 grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
          <Field label="New password" value={next} onChange={setNext} type="password" />
          <Field label="Confirm new password" value={confirm} onChange={setConfirm} type="password" />
        </div>
        {pwError ? (
          <p role="alert" className="mb-3 text-[12px] text-t3">
            {pwError}
          </p>
        ) : null}
        <Button
          variant="ghost"
          onClick={() => void submitPassword()}
          disabled={!current || !next || pwState === 'saving'}
        >
          {pwState === 'saving' ? 'Updating…' : pwState === 'saved' ? 'Password changed ✓' : 'Change password'}
        </Button>
      </section>

      <section className="border-t border-b1 pt-6">
        <h2 className="mb-1 text-[14px] font-semibold">Session</h2>
        <p className="mb-3.5 text-[12px] text-t3">
          Signing out revokes this device&rsquo;s refresh token.
        </p>
        <Button
          variant="outline"
          onClick={async () => {
            await onLogout()
          }}
        >
          <X size={13} className="mr-1.5" />
          Sign out
        </Button>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Danger zone
// ---------------------------------------------------------------------------

function DangerTab({
  onDelete,
  snippetCount,
  snippets,
}: {
  onDelete: () => Promise<void>
  snippetCount: number
  snippets: Snippet[]
}) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Typed confirmation, so a stray click can't delete a library.
  const armed = phrase.trim() === 'DELETE'

  function exportAll() {
    // There's no export endpoint; the snippets are already in the page, so build
    // the file client-side rather than pretending a download happened server-side.
    const payload = snippets.map((s) => ({
      title: s.title,
      description: s.description,
      language: s.language,
      tags: s.tags,
      is_public: s.visibility === 'public',
      code: s.code,
      created_at: s.createdAt,
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'snippetvault-export.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function destroy() {
    setBusy(true)
    setError(null)
    try {
      await onDelete()
      navigate('/auth', { replace: true })
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <section className="rounded-[var(--radius-r2)] border border-[color-mix(in_srgb,var(--red)_20%,transparent)] bg-[color-mix(in_srgb,var(--red)_4%,transparent)] p-5">
      <h2 className="mb-1 text-[14px] font-semibold text-red">Danger Zone</h2>
      <p className="mb-3.5 text-[12px] text-t2">
        Deleting your account removes all {formatNumber(snippetCount)} snippets, your collections
        and your bookmarks. There is no undo.
      </p>

      {!confirming ? (
        <div className="flex flex-wrap gap-2.5">
          <Button variant="danger" size="sm" onClick={exportAll}>
            Export all snippets
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="border-[color-mix(in_srgb,var(--red)_50%,transparent)] bg-[color-mix(in_srgb,var(--red)_5%,transparent)]"
            onClick={() => setConfirming(true)}
          >
            Delete account permanently
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[13px] text-t2">
            Type <span className="font-mono font-semibold text-red">DELETE</span> to confirm.
          </p>
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            aria-label="Type DELETE to confirm"
            className={INPUT}
          />
          {error ? (
            <p role="alert" className="text-[12px] text-t3">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <Button variant="danger" size="sm" disabled={!armed || busy} onClick={() => void destroy()}>
              {busy ? 'Deleting…' : 'Permanently delete my account'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirming(false)
                setPhrase('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function ProfileStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4 text-center">
      <div
        className={cx('font-serif', Number(value.replace(/,/g, '')) > 999 ? 'text-[22px]' : 'text-[28px]')}
        style={{ color }}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[11px] text-t3">{label}</div>
    </div>
  )
}

const INPUT =
  'w-full rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3 py-2.5 text-[13px] text-t1 outline-none transition-colors duration-200 placeholder:text-t4 focus:border-[color-mix(in_srgb,var(--lime)_35%,transparent)]'

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  type?: string
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className="font-mono text-[11px] font-medium tracking-[0.3px] text-t2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={INPUT}
      />
    </div>
  )
}

function PlaceholderPanel({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-16 text-center">
      <Pencil size={22} className="mb-3 text-t4" strokeWidth={1.5} />
      <p className="mb-1 text-[14px] font-medium text-t2">{tab}</p>
      <p className="max-w-[340px] text-[13px] text-t3">
        {tab === 'API Keys'
          ? 'There is no API-key endpoint yet — tokens are issued by signing in, not by key.'
          : 'There is no notifications backend yet, so nothing can arrive here.'}
      </p>
    </div>
  )
}