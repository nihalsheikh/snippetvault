import { Link } from 'react-router-dom'
import {
  BarChart3,
  Compass,
  FileCode2,
  Search,
  Sparkles,
  Tags,
} from 'lucide-react'

import { Button, ButtonLink } from '@/components/ui/Button'
import { CodePreview } from '@/components/ui/CodeBlock'
import { Tag } from '@/components/ui/Chip'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Explanations',
    desc: 'Select any snippet and get an instant, plain-English explanation. No more deciphering legacy code alone.',
  },
  {
    icon: FileCode2,
    title: 'Monaco Editor',
    desc: 'The same editor as VS Code. Syntax highlighting for 30+ languages, keyboard shortcuts, themes.',
  },
  {
    icon: Tags,
    title: 'Smart Auto-Tagging',
    desc: 'Paste your code. AI reads it and tags it with relevant labels before you even save.',
  },
  {
    icon: Search,
    title: 'Natural Language Search',
    desc: 'Type "JWT auth middleware" and find what you need. No exact-match required, ever.',
  },
  {
    icon: Compass,
    title: 'Community Library',
    desc: 'Public snippets from developers worldwide. Copy any snippet in one click and track how often it’s used.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Know which of your snippets people copy the most. Real data on your most valuable code.',
  },
]

const STATS = [
  { num: '48k', label: 'Snippets saved this month' },
  { num: '12k', label: 'Developers using it daily' },
  { num: '300k', label: 'One-click copies served' },
]

const DEMO_SNIPPETS = [
  {
    lang: 'typescript' as const,
    label: 'TypeScript',
    copies: 234,
    tags: ['types', 'api'],
    code: `type ApiResponse<T> = {
  data: T | null
  error?: string
  status: 200 | 400 | 500
}`,
  },
  {
    lang: 'python' as const,
    label: 'Python',
    copies: 189,
    tags: ['decorator', 'utils'],
    code: `def retry(n=3, delay=1.0):
    def decorator(func):
        def wrapper(*args):
            # retry logic`,
  },
  {
    lang: 'go' as const,
    label: 'Go',
    copies: 97,
    tags: ['concurrency'],
    code: `func worker(ctx context.Context,
    jobs <-chan Job) {
  for {
    select {`,
  },
  {
    lang: 'rust' as const,
    label: 'Rust',
    copies: 312,
    tags: ['data-structures'],
    code: `impl<T: Clone> Stack<T> {
  pub fn push(&mut self, v: T) {
    self.data.push(v)
  }`,
  },
]

export function LandingPage() {
  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6 pb-[60px] pt-20 text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(var(--b1) 1px, transparent 1px), linear-gradient(90deg, var(--b1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/2 top-[20%] h-[400px] w-[600px] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(ellipse, color-mix(in srgb, var(--lime) 8%, transparent) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative mb-8 inline-flex items-center gap-2 rounded-[99px] border border-[color-mix(in_srgb,var(--lime)_20%,transparent)] bg-[color-mix(in_srgb,var(--lime)_8%,transparent)] px-3.5 py-[5px] font-mono text-[11px] uppercase tracking-[1px] text-lime">
          <span className="h-1.5 w-1.5 animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-lime" />
          For developers who write good code
        </div>

        <h1 className="relative mb-6 font-serif text-[clamp(48px,7vw,88px)] font-normal leading-[1.05] tracking-[-2px]">
          Your snippets.
          <br />
          <em className="text-lime">Remembered forever.</em>
        </h1>

        <p className="relative mb-11 max-w-[560px] text-[18px] leading-[1.7] text-t2">
          Save, organise, and share your code snippets. AI explains any snippet instantly. Your
          team&rsquo;s collective knowledge, searchable.
        </p>

        <div className="relative flex flex-wrap justify-center gap-3">
          <ButtonLink to="/auth?mode=signup" size="lg">
            Start for free →
          </ButtonLink>
          <ButtonLink to="/community" variant="ghost" size="lg">
            View community library
          </ButtonLink>
        </div>
      </section>

      {/* ============ PRODUCT DEMO ============ */}
      <section className="relative mx-auto max-w-[880px] px-6 pt-20">
        <div className="overflow-hidden rounded-[var(--radius-r3)] border border-b2 bg-s2 shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2.5 border-b border-b1 bg-s1 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#fbbf24]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
            </div>
            <span className="m-auto font-mono text-[11px] text-t3">
              snippetvault.dev — Dashboard
            </span>
          </div>

          <div className="grid min-h-[400px] grid-cols-[220px_1fr] max-md:grid-cols-1">
            <div className="border-r border-b1 py-4 max-md:hidden">
              <div className="mb-1 border-b border-b1 px-4 pb-4">
                <div className="font-mono text-[11px] font-bold text-lime">SV</div>
              </div>
              {[
                { label: 'All snippets', color: 'var(--lime)' },
                { label: 'JavaScript', color: 'var(--cyan)' },
                { label: 'Python', color: 'var(--yellow)' },
                { label: 'Rust', color: 'var(--orange)' },
                { label: 'TypeScript', color: 'var(--purple)' },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={`flex items-center gap-2.5 px-4 py-2 text-[12px] transition-colors ${
                    i === 0 ? 'bg-b1 text-t1' : 'text-t2 hover:bg-b1 hover:text-t1'
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: row.color }}
                  />
                  {row.label}
                </div>
              ))}
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                {DEMO_SNIPPETS.map((snippet) => (
                  <div
                    key={snippet.label}
                    className="overflow-hidden rounded-[var(--radius-r2)] border border-b1 bg-s3 transition-colors hover:border-b2"
                  >
                    <div className="flex items-center justify-between border-b border-b1 px-3 py-2.5">
                      <DemoLang label={snippet.label} lang={snippet.lang} />
                      <span className="font-mono text-[10px] text-t3">⎘ {snippet.copies}</span>
                    </div>
                    <CodePreview
                      code={snippet.code}
                      language={snippet.lang}
                      maxLines={4}
                      className="border-b-0 bg-transparent px-3 py-2.5 font-mono text-[10px] leading-[1.6] text-t2"
                    />
                    <div className="flex items-center gap-1.5 border-t border-b1 px-3 py-2">
                      {snippet.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="mx-auto max-w-[1000px] scroll-mt-20 px-6 py-[100px]">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-lime">
          Why SnippetVault
        </div>
        <h2 className="mb-[60px] font-serif text-[clamp(32px,4vw,48px)] leading-[1.15] tracking-[-1px]">
          Everything a developer
          <br />
          actually needs
        </h2>

        <div className="grid grid-cols-3 gap-[2px] overflow-hidden rounded-[var(--radius-r3)] border border-b1 bg-b1 max-md:grid-cols-2 max-sm:grid-cols-1">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="bg-s1 p-7 transition-colors duration-200 hover:bg-s2">
              <feature.icon size={22} className="mb-3.5 text-lime" strokeWidth={1.75} />
              <h3 className="mb-2 text-[15px] font-semibold text-t1">{feature.title}</h3>
              <p className="text-[13px] leading-[1.65] text-t2">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="mx-auto grid max-w-[800px] grid-cols-3 gap-6 px-6 pb-[100px] text-center max-sm:grid-cols-1">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <div className="font-serif text-[52px] leading-none text-lime">{stat.num}</div>
            <div className="mt-1.5 text-[13px] text-t2">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ============ BOTTOM CTA ============ */}
      <section className="bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--lime)_4%,transparent))] px-6 py-[100px] text-center">
        <h2 className="mb-4 font-serif text-[clamp(32px,5vw,60px)] tracking-[-1.5px]">
          Your code. <em className="text-lime">Always at hand.</em>
        </h2>
        <p className="mb-9 text-[16px] text-t2">
          Stop re-searching for the same patterns. Start building your personal library.
        </p>
        <Link to="/auth?mode=signup">
          <Button size="lg">Create free account →</Button>
        </Link>
      </section>
    </>
  )
}

function DemoLang({ label, lang }: { label: string; lang: 'typescript' | 'python' | 'go' | 'rust' }) {
  const colors: Record<string, [string, string]> = {
    typescript: ['rgba(34,211,238,0.1)', '#22d3ee'],
    python: ['rgba(250,204,21,0.1)', '#fbbf24'],
    go: ['rgba(97,218,251,0.1)', '#61dafb'],
    rust: ['rgba(251,146,60,0.1)', '#fb923c'],
  }
  const [bg, color] = colors[lang]
  return (
    <span
      className="rounded-[4px] px-[7px] py-0.5 font-mono text-[10px] font-semibold"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}