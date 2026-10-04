import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2, MailWarning, Send } from 'lucide-react'

import { Button, ButtonLink } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loader } from '@/components/ui/Loader'
import { authApi } from '@/lib/api'

type Status = 'verifying' | 'success' | 'error'
type ResendStatus = 'idle' | 'sending' | 'sent'

/** Backend error `detail` → what we show the user. */
const ERROR_COPY: Record<string, string> = {
  'Invalid verification token':
    'This verification link is not valid. It may have been mistyped, or issued for a different address.',
  'Verification token has already been used':
    'This link has already been used. Your email is verified — just sign in and continue.',
  'Verification token has expired':
    'This link has expired. Verification links are only good for 10 minutes, so request a fresh one.',
  'User not found':
    'We could not find an account for this link.',
}

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error')
  const [message, setMessage] = useState(
    token ? 'Checking your link…' : 'This link is missing its verification token.',
  )

  // React 18 StrictMode double-invokes effects in dev. The endpoint consumes the
  // token on first use, so the second call would come back 409 "already used" and
  // replace a real success with an error. One shot, guarded.
  const fired = useRef(false)

  const verify = useCallback(async () => {
    if (!token) return

    setStatus('verifying')
    setMessage('Checking your link…')

    try {
      await authApi.verifyEmail(token)
      setStatus('success')
      setMessage('Your email address is verified.')
    } catch (err) {
      setStatus('error')
      setMessage(
        ERROR_COPY[err instanceof Error ? err.message : ''] ??
          'Something went wrong while verifying your email.',
      )
    }
  }, [token])

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    void verify()
  }, [verify])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div
        className={`mb-6 flex h-[64px] w-[64px] items-center justify-center rounded-full border ${
          status === 'success'
            ? 'border-[color-mix(in_srgb,var(--lime)_35%,transparent)] bg-[color-mix(in_srgb,var(--lime)_10%,transparent)] text-lime'
            : status === 'error'
              ? 'border-[color-mix(in_srgb,var(--red)_35%,transparent)] bg-[color-mix(in_srgb,var(--red)_10%,transparent)] text-red'
              : 'border-b2 bg-s2 text-t3'
        }`}
      >
        {status === 'verifying' ? (
          /* The shared dot-grid, not a lone spinner: this page is mostly waiting on
             the network, and the app-wide loader is what every other wait looks like. */
          <Loader size={88} className="text-t3" label="Verifying" />
        ) : status === 'success' ? (
          <CheckCircle2 size={28} />
        ) : status === 'error' ? (
          <AlertCircle size={28} />
        ) : (
          <MailWarning size={26} />
        )}
      </div>

      {status === 'verifying' ? (
        <h1 className="mb-3 font-serif text-[clamp(28px,4.5vw,44px)] leading-[1.1] tracking-[-1.2px]">
          Verifying your email
        </h1>
      ) : status === 'success' ? (
        <h1 className="mb-3 font-serif text-[clamp(28px,4.5vw,44px)] leading-[1.1] tracking-[-1.2px]">
          Email verified.
        </h1>
      ) : (
        <h1 className="mb-3 font-serif text-[clamp(28px,4.5vw,44px)] leading-[1.1] tracking-[-1.2px]">
          We couldn't verify that link
        </h1>
      )}

      <p className="mb-8 max-w-[420px] text-[15px] leading-[1.7] text-t2">{message}</p>

      <div className="flex flex-wrap justify-center gap-3">
        {status === 'success' ? (
          <ButtonLink to="/auth?mode=login" size="lg">
            Sign in to continue
          </ButtonLink>
        ) : null}

        {status === 'error' ? (
          <>
            {/* Signing in is impossible until the address is verified, so this is
                the only useful way forward — the account exists but is locked out
                of every authenticated route. */}
            <ButtonLink to="/auth?mode=login" size="lg">
              I already verified
            </ButtonLink>
            <ButtonLink to="/auth?mode=signup" variant="ghost" size="lg">
              Sign up again
            </ButtonLink>
          </>
        ) : null}

        {status === 'verifying' ? (
          <Link to="/" className="font-mono text-[12px] text-t3 no-underline hover:text-t1">
            go back to the homepage
          </Link>
        ) : null}
      </div>

      {status === 'error' ? <ResendForm /> : null}
    </div>
  )
}

/**
 * Reissues the signup link. The endpoint answers identically whether or not the
 * address has an unverified account, so this is deliberately not branched on the
 * result — reporting it would turn the form into an account-enumeration oracle.
 */
function ResendForm() {
  const [email, setEmail] = useState('')
  const [resend, setResend] = useState<ResendStatus>('idle')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setResend('sending')
    try {
      await authApi.resendVerification(email.trim())
    } catch {
      // Same reasoning as above — a network failure is the only case worth
      // mentioning, and it leaks nothing about whether the account exists.
    }
    setResend('sent')
  }

  if (resend === 'sent') {
    return (
      <p className="mt-8 max-w-[420px] font-mono text-[11px] leading-[1.7] text-t4">
        If an unverified account exists for that address, a fresh link is on its way. New links
        are good for 10 minutes and work only once.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 w-full max-w-[380px]">
      <p className="mb-3 text-[13px] leading-[1.7] text-t2">
        Lost the link? Send yourself a new one.
      </p>
      <div className="flex items-start gap-2">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-0 flex-1"
        />
        <Button type="submit" disabled={resend === 'sending'} className="shrink-0">
          {resend === 'sending' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Sending…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Send size={13} /> Resend
            </span>
          )}
        </Button>
      </div>
    </form>
  )
}
