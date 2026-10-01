import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2, MailWarning } from 'lucide-react'

import { ButtonLink } from '@/components/ui/Button'

type Status = 'verifying' | 'success' | 'error'

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
      const res = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (res.ok) {
        setStatus('success')
        setMessage('Your email address is verified.')
        return
      }

      const detail = await res.json().catch(() => null)
      const raw = typeof detail?.detail === 'string' ? detail.detail : ''

      setStatus('error')
      setMessage(ERROR_COPY[raw] ?? 'Something went wrong while verifying your email.')
    } catch {
      setStatus('error')
      setMessage('Could not reach the server. Check your connection and try again.')
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
          <Loader2 size={26} className="animate-spin" />
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
            <ButtonLink to="/auth?mode=signup" size="lg">
              Back to sign up
            </ButtonLink>
            <ButtonLink to="/auth?mode=login" variant="ghost" size="lg">
              I already verified
            </ButtonLink>
          </>
        ) : null}

        {status === 'verifying' ? (
          <Link to="/" className="font-mono text-[12px] text-t3 no-underline hover:text-t1">
            go back to the homepage
          </Link>
        ) : null}
      </div>

      {status === 'error' ? (
        <p className="mt-8 max-w-[420px] font-mono text-[11px] leading-[1.7] text-t4">
          Lost the original email? Sign up again with the same address and we will send a new link.
        </p>
      ) : null}
    </div>
  )
}
