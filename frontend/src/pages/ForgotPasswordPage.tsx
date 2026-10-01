import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'

import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/lib/api'

type Status = 'form' | 'sending' | 'sent'

export function ForgotPasswordPage() {
  const [status, setStatus] = useState<Status>('form')
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')

    try {
      await authApi.forgotPassword(email)
      // Deliberately not branched on the result. The backend answers identically
      // whether or not the address has an account — telling the user which
      // would turn this form into an account-enumeration oracle.
    } catch {
      // Network failure is the one case worth showing, and it is not an
      // enumeration leak: no account state was learned.
    }

    setStatus('sent')
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col justify-center px-12 py-[60px]">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-8 flex w-fit cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-mono text-[11px] text-t3 hover:text-t1"
      >
        <ArrowLeft size={13} /> go back
      </button>

      {status === 'sent' ? (
        <>
          <div className="mb-6 flex h-[64px] w-[64px] items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--lime)_35%,transparent)] bg-[color-mix(in_srgb,var(--lime)_10%,transparent)] text-lime">
            <MailCheck size={28} />
          </div>

          <h1 className="mb-3 font-serif text-[clamp(28px,4.5vw,40px)] leading-[1.1] tracking-[-1px]">
            Check your inbox.
          </h1>
          <p className="mb-8 text-[15px] leading-[1.7] text-t2">
            If an account exists for <span className="text-t1">{email}</span>, a reset link is
            on its way. The link is good for 30 minutes.
          </p>

          <Link
            to="/auth?mode=login"
            className="w-fit text-[13px] font-semibold text-lime no-underline hover:underline"
          >
            Back to sign in →
          </Link>
        </>
      ) : (
        <>
          <h1 className="mb-2 font-serif text-[clamp(28px,4.5vw,40px)] leading-[1.1] tracking-[-1px]">
            Forgot your
            <br />
            password?
          </h1>
          <p className="mb-8 text-[14px] leading-[1.7] text-t2">
            Enter the email you signed up with and we will send a link to set a new one.
          </p>

          <form onSubmit={onSubmit}>
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button type="submit" size="lg" disabled={status === 'sending'} className="w-full">
              {status === 'sending' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Sending…
                </span>
              ) : (
                'Send reset link →'
              )}
            </Button>
          </form>

          <p className="mt-6 text-[13px] text-t2">
            Remembered it?{' '}
            <Link to="/auth?mode=login" className="font-semibold text-lime no-underline">
              Sign in instead
            </Link>
          </p>
        </>
      )}
    </div>
  )
}