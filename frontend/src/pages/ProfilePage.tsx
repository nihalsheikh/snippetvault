import { useState } from 'react'
import { Camera, Pencil } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { currentUser, dashboardStats, mySnippets } from '@/lib/data'
import { cx, formatNumber } from '@/lib/format'

const TABS = ['Profile', 'Account', 'Appearance', 'API Keys', 'Notifications', 'Danger Zone']

export function ProfilePage() {
  const [tab, setTab] = useState('Profile')
  const [saved, setSaved] = useState(false)

  const snippets = mySnippets.length
  const totalCopies = mySnippets.reduce((sum, s) => sum + s.copies, 0)
  const bestCopies = Math.max(0, ...mySnippets.map((s) => s.copies))

  return (
    <div className="mx-auto max-w-[820px] px-6 py-9">
      {/* ---------- cover + identity ---------- */}
      <div className="relative mb-[-40px] h-40 rounded-[var(--radius-r3)] border border-b1 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--lime)_8%,transparent),color-mix(in_srgb,var(--purple)_8%,transparent))]">
        <button
          type="button"
          className="absolute right-3 top-3 cursor-pointer rounded-[var(--radius-r1)] border border-b2 bg-b1 px-3 py-1.5 font-mono text-[11px] text-t1 backdrop-blur-[8px] transition-colors hover:bg-s3"
        >
          Edit cover
        </button>
      </div>

      <div className="relative z-10 mb-6 flex items-end gap-4 px-6">
        <div className="relative">
          <Avatar
            author={currentUser}
            size="xl"
            className="border-[3px] border-bg"
          />
          <button
            type="button"
            aria-label="Change avatar"
            className="absolute bottom-0.5 right-0.5 flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border border-b2 bg-s2 text-t2 transition-colors hover:text-t1"
          >
            <Camera size={10} />
          </button>
        </div>
        <div className="min-w-0 flex-1 pb-3">
          <h1 className="mb-0.5 font-serif text-[24px] tracking-[-0.5px]">{currentUser.name}</h1>
          <div className="mb-2 font-mono text-[13px] text-t3">
            @{currentUser.username} · nihalsheikh.dev
          </div>
          <p className="text-[13px] text-t2">
            Computer Engineer · Building SnippetVault &amp; EigenVault · Open to work 🟢
          </p>
        </div>
        <div className="pb-3">
          <Button variant="ghost" size="sm">
            Share profile ↗
          </Button>
        </div>
      </div>

      {/* ---------- stats ---------- */}
      <div className="mb-8 grid grid-cols-4 gap-3 max-md:grid-cols-2">
        <ProfileStat value={String(snippets || dashboardStats.totalSnippets)} label="Snippets" color="var(--lime)" />
        <ProfileStat value={formatNumber(totalCopies)} label="Total copies" color="var(--t1)" />
        <ProfileStat value={String(dashboardStats.aiExplains)} label="AI explains" color="var(--purple)" />
        <ProfileStat value={formatNumber(bestCopies)} label="Best snippet copies" color="var(--t1)" />
      </div>

      {/* ---------- tabs ---------- */}
      <div className="mb-7 flex overflow-x-auto border-b border-b1 max-md:text-[11px]">
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

      {tab === 'Profile' ? (
        <>
          <section className="mb-7">
            <h2 className="mb-1 text-[14px] font-semibold">Public profile</h2>
            <p className="mb-4 text-[12px] text-t3">
              This information is visible to anyone who visits your profile.
            </p>
            <div className="mb-3.5 grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
              <Field label="Display name" defaultValue={currentUser.name} />
              <Field label="Username" defaultValue={currentUser.username} />
            </div>
            <div className="mb-3.5 grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
              <Field label="Website" defaultValue="nihalsheikh.dev" />
              <Field label="GitHub" defaultValue="@nihalsheikh" />
            </div>
            <div className="mb-3.5 flex flex-col gap-[5px]">
              <label className="font-mono text-[11px] font-medium tracking-[0.3px] text-t2">Bio</label>
              <textarea
                defaultValue="Computer Engineer · Building SnippetVault & EigenVault · Open to work 🟢"
                rows={3}
                className="w-full resize-none rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3 py-2.5 text-[13px] leading-[1.6] text-t1 outline-none transition-colors duration-200 focus:border-[color-mix(in_srgb,var(--lime)_35%,transparent)]"
              />
            </div>
          </section>

          <section className="mb-7 border-t border-b1 pt-6">
            <h2 className="mb-1 text-[14px] font-semibold">Preferences</h2>
            <p className="mb-2 text-[12px] text-t3">Control how SnippetVault works for you.</p>
            <Toggle defaultOn label="Default snippet visibility" description="New snippets are public by default" />
            <Toggle defaultOn label="AI auto-tagging" description="Automatically suggest tags when you paste code" />
            <Toggle label="AI auto-explanation" description="Generate explanation when saving a new snippet" />
            <Toggle label="Copy notifications" description="Email me when someone copies my public snippet" />
          </section>

          <section className="mb-7 border-t border-b1 pt-6">
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

          <div className="flex justify-end pb-7">
            <Button
              size="lg"
              onClick={() => {
                setSaved(true)
                window.setTimeout(() => setSaved(false), 1800)
              }}
            >
              {saved ? 'Saved ✓' : 'Save changes →'}
            </Button>
          </div>

          <section className="rounded-[var(--radius-r2)] border border-[color-mix(in_srgb,var(--red)_20%,transparent)] bg-[color-mix(in_srgb,var(--red)_4%,transparent)] p-5">
            <h2 className="mb-1 text-[14px] font-semibold text-red">Danger Zone</h2>
            <p className="mb-3.5 text-[12px] text-t2">
              These actions are irreversible. Make sure you know what you&rsquo;re doing before
              proceeding.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="danger" size="sm">
                Export all snippets
              </Button>
              <Button variant="danger" size="sm">
                Delete all snippets
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="border-[color-mix(in_srgb,var(--red)_50%,transparent)] bg-[color-mix(in_srgb,var(--red)_5%,transparent)]"
              >
                Delete account permanently
              </Button>
            </div>
          </section>
        </>
      ) : (
        <PlaceholderPanel tab={tab} />
      )}
    </div>
  )
}

function ProfileStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-[var(--radius-r2)] border border-b1 bg-s1 p-4 text-center">
      <div
        className={cx('font-serif', Number(value) > 999 ? 'text-[22px]' : 'text-[28px]')}
        style={{ color }}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[11px] text-t3">{label}</div>
    </div>
  )
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className="font-mono text-[11px] font-medium tracking-[0.3px] text-t2">{label}</label>
      <input
        defaultValue={defaultValue}
        className="w-full rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3 py-2.5 text-[13px] text-t1 outline-none transition-colors duration-200 focus:border-[color-mix(in_srgb,var(--lime)_35%,transparent)]"
      />
    </div>
  )
}

function PlaceholderPanel({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-r2)] border border-dashed border-b2 py-16 text-center">
      <Pencil size={22} className="mb-3 text-t4" strokeWidth={1.5} />
      <p className="mb-1 text-[14px] font-medium text-t2">{tab}</p>
      <p className="text-[13px] text-t3">This panel is part of the backend rollout.</p>
    </div>
  )
}