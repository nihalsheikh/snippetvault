import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Input } from '@/components/ui/Input'
import { CodePreview } from '@/components/ui/CodeBlock'
import { LanguageBadge } from '@/components/ui/LanguageBadge'
import { Tag } from '@/components/ui/Chip'
import { cx, formatNumber } from '@/lib/format'

type Mode = 'login' | 'signup'

const SHOWCASE = [
  {
    lang: 'typescript' as const,
    copies: 1204,
    tags: ['hooks', 'typescript', 'react'],
    code: `const useDebounce = <T>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => { /* ... */ }, [value, delay])
}`,
  },
  {
    lang: 'python' as const,
    copies: 847,
    tags: [],
    code: `from functools import wraps
def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs): ...`,
  },
  {
    lang: 'go' as const,
    copies: 623,
    tags: [],
    code: `func withTimeout(ctx context.Context, d time.Duration,
    fn func() error) error {
    ctx, cancel := context.WithTimeout(ctx, d) ...`,
  },
]

export function AuthPage() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState<Mode>(initial)
  const [loading, setLoading] = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setParams({ mode: next }, { replace: true })
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // The backend auth endpoints are still being built — the UI is complete,
    // so this is where the fetch to /api/auth/* will land.
    setLoading(true)
    window.setTimeout(() => setLoading(false), 600)
  }

  return (
    <div className="grid min-h-screen grid-cols-2 max-lg:grid-cols-1">
      {/* ---- form pane ---- */}
      {/* `mx-auto` centres the 480px block inside the grid cell; without it the
          whole form drifts to the left edge of the column. */}
      <div className="mx-auto flex w-full max-w-[480px] flex-col justify-center px-12 py-[60px] max-lg:max-w-[560px]">
        <Link to="/" className="mb-12 font-mono text-[16px] font-bold tracking-[-0.5px] text-lime no-underline">
          SnippetVault <span className="text-t4">/_</span>
        </Link>

        <h1 className="mb-2 font-serif text-[36px] leading-[1.1] tracking-[-0.8px]">
          {mode === 'login' ? (
            <>
              Welcome back,
              <br />
              developer.
            </>
          ) : (
            <>
              Start your
              <br />
              library.
            </>
          )}
        </h1>
        <p className="mb-9 text-[14px] text-t2">
          {mode === 'login'
            ? 'Your snippets are waiting. Sign in to continue.'
            : 'Free forever for up to 100 snippets. No card required.'}
        </p>

        <div className="mb-7 flex overflow-hidden rounded-[var(--radius-r1)] border border-b1">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cx(
                'flex-1 cursor-pointer bg-transparent py-2.5 text-[13px] font-medium transition-all duration-200',
                mode === m ? 'bg-b1 text-t1' : 'text-t2 hover:text-t1',
              )}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit}>
          {mode === 'signup' ? (
            <>
              <Input label="Full name" type="text" placeholder="Nihal Sheikh" autoComplete="name" />
              <Input
                label="Username"
                type="text"
                placeholder="nihalsheikh"
                autoComplete="username"
                hint="snippetvault.dev/@nihalsheikh"
              />
            </>
          ) : null}

          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder={mode === 'signup' ? 'min. 8 characters' : '••••••••••'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            hint={
              mode === 'signup' ? (
                'Must contain uppercase, number, and special character'
              ) : (
                <Link to="/auth" className="ml-auto block text-[11px] text-lime no-underline">
                  Forgot password?
                </Link>
              )
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full cursor-pointer rounded-[var(--radius-r2)] bg-lime py-[13px] text-[14px] font-bold tracking-[-0.2px] text-[var(--on-lime)] transition-colors duration-200 hover:bg-[var(--lime-hover)] disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[12px] text-t3 before:h-px before:flex-1 before:bg-b1 before:content-[''] after:h-px after:flex-1 after:bg-b1 after:content-['']">
          or continue with
        </div>

        <button
          type="button"
          className="mb-2.5 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3.5 py-2.5 text-[13px] text-t1 transition-colors duration-200 hover:bg-s3"
        >
          <GithubIcon />
          Continue with GitHub
        </button>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[var(--radius-r1)] border border-b1 bg-s2 px-3.5 py-2.5 text-[13px] text-t1 transition-colors duration-200 hover:bg-s3"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="mt-5 text-center text-[13px] text-t2">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-lime"
          >
            {mode === 'login' ? 'Create one →' : 'Sign in →'}
          </button>
        </div>
      </div>

      {/* ---- showcase pane ---- */}
      <div className="relative flex flex-col justify-center overflow-hidden border-l border-b1 bg-s1 px-10 py-[60px] max-lg:hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(var(--b1) 1px, transparent 1px), linear-gradient(90deg, var(--b1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-[10%] top-[30%] h-[400px] w-[400px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--purple) 8%, transparent), transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative mb-8">
          <div className="mb-1.5 font-mono text-[14px] text-t2">// Most copied this week</div>
          <div className="font-serif text-[22px] tracking-[-0.4px] text-t1">
            Join 12,000 developers
            <br />
            saving time every day
          </div>
        </div>

        <div className="relative flex flex-col gap-3">
          {SHOWCASE.map((item, i) => (
            <div
              key={item.lang}
              className="rounded-[var(--radius-r2)] border border-b2 bg-[color-mix(in_srgb,var(--s2)_90%,transparent)] p-3.5 backdrop-blur-[10px] transition-transform duration-300"
              style={{ transform: `translateX(${[0, 24, 8][i]}px)` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <LanguageBadge language={item.lang} />
                <span className="ml-auto font-mono text-[10px] text-t3">
                  ⎘ {formatNumber(item.copies)} copies
                </span>
              </div>
              <CodePreview
                code={item.code}
                language={item.lang}
                maxLines={3}
                className="bg-transparent p-0 font-mono text-[10px] leading-[1.6] text-t2"
              />
              {item.tags.length ? (
                <div className="mt-2 flex gap-1">
                  {item.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GithubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.02h3.86c2.26-2.08 3.56-5.15 3.56-8.89z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.93-2.91l-3.86-3.02c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.13A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.6H1.29a12 12 0 0 0 0 10.8l3.98-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.6l3.98 3.13C6.22 6.87 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}