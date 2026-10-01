import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from 'lucide-react'

import { Input } from '@/components/ui/Input'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ApiError, authApi } from '@/lib/api'

type Status = 'form' | 'submitting' | 'success' | 'error'

/** Backend error `detail` → what we show the user. */
const ERROR_COPY: Record<string, string> = {
  'Invalid reset token':
    'This reset link is not valid. It may have been mistyped, or issued for a different account.',
  'Reset token has already been used':
    'This link has already been used. Your password is already set — just sign in and continue.',
  'Reset token has expired':
    'This link has expired. Reset links are only good for 30 minutes, so request a fresh one.',
  'New passwords do not match':
    'Those two passwords do not match. Retype them carefully.',
  'User not found':
    'We could not find an account for this link.',
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [status, setStatus] = useState<Status>('form')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const missingToken = !token

  // Client-side mismatch is worth catching before spending a token the backend
  // would reject with the same complaint.
  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    if (password !== confirm) {
      setStatus('error')
      setMessage(ERROR_COPY['New passwords do not match'])
      return
    }

    setStatus('submitting')

    void (async () => {
      try {
        await authApi.resetPassword({
          token,
          new_password: password,
          confirm_new_password: confirm,
        })
        setStatus('success')
      } catch (err) {
        // `request()` has already flattened the three backend error shapes into
        // a readable message, so a 404/409 arrives as the backend's own `detail`
        // string — which is the key ERROR_COPY is written against.
        const raw = err instanceof ApiError ? err.message : ''
        setStatus('error')
        setMessage(ERROR_COPY[raw] ?? 'Something went wrong while resetting your password.')
      }
    })()
  }

  // Clear the password fields once a request settles, so a failed attempt does
  // not leave a half-typed secret sitting in the DOM.
  const clearPasswords = useCallback(() => {
    setPassword('')
    setConfirm('')
  }, [])

  useEffect(() => {
    if (status === 'error' || status === 'success') clearPasswords()
  }, [status, clearPasswords])

  if (missingToken) {
    return (
      <ResultShell
        icon={<KeyRound size={28} />}
        tone="idle"
        title="This link is incomplete"
        message="The reset link is missing its token. Open the link straight from the email, or request a fresh one."
      >
        <ButtonLink to="/forgot-password" size="lg">
          Request a new link
        </ButtonLink>
      </ResultShell>
    )
  }

  if (status === 'success') {
    return (
      <ResultShell
        icon={<CheckCircle2 size={28} />}
        tone="success"
        title="Password updated."
        message="You can now sign in with your new password."
      >
        <ButtonLink to="/auth?mode=login" size="lg">
          Sign in to continue
        </ButtonLink>
      </ResultShell>
    )
  }

  // A dead token is not worth re-showing the form: the same token will fail again.
  const tokenIsDead =
    status === 'error' &&
    (message === ERROR_COPY['Invalid reset token'] ||
      message === ERROR_COPY['Reset token has already been used'] ||
      message === ERROR_COPY['Reset token has expired'] ||
      message === ERROR_COPY['User not found'])

  if (tokenIsDead) {
    return (
      <ResultShell
        icon={<AlertCircle size={28} />}
        tone="error"
        title="We couldn't use that link"
        message={message}
      >
        <ButtonLink to="/forgot-password" size="lg">
          Request a new link
        </ButtonLink>
      </ResultShell>
    )
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col justify-center px-12 py-[60px]">
      <h1 className="mb-2 font-serif text-[clamp(28px,4.5vw,40px)] leading-[1.1] tracking-[-1px]">
        Set a new
        <br />
        password.
      </h1>
      <p className="mb-8 text-[14px] leading-[1.7] text-t2">
        Pick something you haven't used here before. Minimum 6 characters.
      </p>

      <form onSubmit={onSubmit}>
        <Input
          label="New password"
          type="password"
          placeholder="••••••••••"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          placeholder="••••••••••"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {status === 'error' ? (
          <p className="mb-4 flex items-start gap-2 rounded-[var(--radius-r1)] border border-[color-mix(in_srgb,var(--red)_30%,transparent)] bg-[color-mix(in_srgb,var(--red)_8%,transparent)] px-3.5 py-2.5 text-[12px] leading-[1.6] text-red">
            <AlertCircle size={14} className="mt-px shrink-0" />
            {message}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={status === 'submitting'} className="w-full">
          {status === 'submitting' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Updating…
            </span>
          ) : (
            'Update password →'
          )}
        </Button>
      </form>
    </div>
  )
}

function ResultShell({
  icon,
  tone,
  title,
  message,
  children,
}: {
  icon: React.ReactNode
  tone: 'idle' | 'success' | 'error'
  title: string
  message: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div
        className={`mb-6 flex h-[64px] w-[64px] items-center justify-center rounded-full border ${
          tone === 'success'
            ? 'border-[color-mix(in_srgb,var(--lime)_35%,transparent)] bg-[color-mix(in_srgb,var(--lime)_10%,transparent)] text-lime'
            : tone === 'error'
              ? 'border-[color-mix(in_srgb,var(--red)_35%,transparent)] bg-[color-mix(in_srgb,var(--red)_10%,transparent)] text-red'
              : 'border-b2 bg-s2 text-t3'
        }`}
      >
        {icon}
      </div>

      <h1 className="mb-3 font-serif text-[clamp(28px,4.5vw,44px)] leading-[1.1] tracking-[-1.2px]">
        {title}
      </h1>

      <p className="mb-8 max-w-[420px] text-[15px] leading-[1.7] text-t2">{message}</p>

      {children}
    </div>
  )
}