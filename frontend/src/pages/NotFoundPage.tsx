import { Link } from 'react-router-dom'
import { ButtonLink } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-lime">404</div>
      <h1 className="mb-3 font-serif text-[clamp(32px,5vw,56px)] leading-[1.1] tracking-[-1.5px]">
        This snippet doesn't exist.
      </h1>
      <p className="mb-8 max-w-[420px] text-[15px] leading-[1.7] text-t2">
        The page you were looking for was moved, deleted, or never saved in the first place.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink to="/dashboard" size="lg">
          Back to your library
        </ButtonLink>
        <ButtonLink to="/community" variant="ghost" size="lg">
          Explore community
        </ButtonLink>
      </div>
      <Link to="/" className="mt-8 font-mono text-[12px] text-t3 no-underline hover:text-t1">
        or go back to the homepage
      </Link>
    </div>
  )
}