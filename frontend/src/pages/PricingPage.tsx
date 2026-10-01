import { Check } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    blurb: 'For trying it out and small personal libraries.',
    features: ['100 snippets', 'Monaco editor', 'AI explanations (10/mo)', 'Natural language search', '1 API key'],
    cta: 'Start free',
    accent: false,
  },
  {
    name: 'Pro',
    price: '$8',
    period: 'per month',
    blurb: 'For developers with a serious personal library.',
    features: [
      'Unlimited snippets',
      'AI explanations (unlimited)',
      'Auto-tagging on paste',
      'Full copy analytics',
      'Unlimited API keys',
      'Team sharing',
    ],
    cta: 'Start 14-day trial',
    accent: true,
  },
  {
    name: 'Team',
    price: '$24',
    period: 'per user / month',
    blurb: 'Shared knowledge across an engineering org.',
    features: ['Everything in Pro', 'Shared team library', 'Private collections', 'SSO & audit log', 'Priority support'],
    cta: 'Talk to us',
    accent: false,
  },
]

export function PricingPage() {
  return (
    <>
      <section className="mx-auto max-w-[1000px] px-6 py-20 text-center">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-lime">Pricing</div>
        <h1 className="mb-4 font-serif text-[clamp(32px,5vw,56px)] leading-[1.1] tracking-[-1.5px]">
          Simple, honest pricing.
        </h1>
        <p className="mx-auto max-w-[520px] text-[16px] leading-[1.7] text-t2">
          Start free and stay free as long as you like. Upgrade only when your library outgrows it.
        </p>
        <div className="mt-6 flex justify-center">
          <ThemeToggle />
        </div>
      </section>

      <section className="mx-auto grid max-w-[1000px] grid-cols-3 gap-3.5 px-6 pb-24 max-md:grid-cols-1">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={
              plan.accent
                ? 'relative flex flex-col rounded-[var(--radius-r3)] border border-[color-mix(in_srgb,var(--lime)_35%,transparent)] bg-[color-mix(in_srgb,var(--lime)_4%,transparent)] p-7'
                : 'relative flex flex-col rounded-[var(--radius-r3)] border border-b1 bg-s1 p-7'
            }
          >
            {plan.accent ? (
              <span className="absolute -top-2.5 left-7 rounded-full bg-lime px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.8px] text-[var(--on-lime)]">
                Most popular
              </span>
            ) : null}

            <h2 className="mb-1 text-[15px] font-semibold text-t1">{plan.name}</h2>
            <p className="mb-5 text-[13px] leading-[1.6] text-t3">{plan.blurb}</p>

            <div className="mb-1 flex items-baseline gap-1.5">
              <span className="font-serif text-[44px] leading-none text-t1">{plan.price}</span>
              <span className="text-[12px] text-t3">{plan.period}</span>
            </div>

            <ButtonLink
              to="/auth?mode=signup"
              variant={plan.accent ? 'primary' : 'ghost'}
              size="lg"
              className="my-6 w-full"
            >
              {plan.cta}
            </ButtonLink>

            <ul className="flex flex-col gap-2.5 border-t border-b1 pt-5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13px] text-t2">
                  <Check size={14} className="mt-0.5 shrink-0 text-lime" strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  )
}