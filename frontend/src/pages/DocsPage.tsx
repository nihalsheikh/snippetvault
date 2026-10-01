import { CodePreview } from '@/components/ui/CodeBlock'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const ENDPOINTS = [
  { method: 'GET', path: '/api/snippets', desc: 'List your snippets, filterable by language and visibility.' },
  { method: 'POST', path: '/api/snippets', desc: 'Create a snippet. Accepts code, language, tags and visibility.' },
  { method: 'GET', path: '/api/snippets/{id}', desc: 'Fetch a single snippet with its copy count and explanation.' },
  { method: 'PATCH', path: '/api/snippets/{id}', desc: 'Update title, description, tags or visibility.' },
  { method: 'DELETE', path: '/api/snippets/{id}', desc: 'Permanently remove a snippet you own.' },
  { method: 'POST', path: '/api/snippets/{id}/copy', desc: 'Increment the copy counter and return the raw code.' },
  { method: 'POST', path: '/api/snippets/explain', desc: 'Generate a plain-English explanation for a code block.' },
  { method: 'GET', path: '/api/snippets/search', desc: 'Natural-language search across your library.' },
]

const CURL = `curl https://api.snippetvault.dev/api/snippets \\
  -H "Authorization: Bearer $SNIPPETVAULT_TOKEN" \\
  -H "Content-Type: application/json"

# → { "data": [ ... ], "total": 48 }`

export function DocsPage() {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-16">
      <div className="mb-3 flex items-center gap-3">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-lime">Docs</div>
        <ThemeToggle className="ml-auto" />
      </div>

      <h1 className="mb-4 font-serif text-[clamp(32px,5vw,52px)] leading-[1.1] tracking-[-1.5px]">
        Build on SnippetVault.
      </h1>
      <p className="mb-10 text-[16px] leading-[1.7] text-t2">
        Everything in the app is available over a small, predictable REST API. Authenticate with a
        bearer token and you&rsquo;re set.
      </p>

      <section className="mb-12">
        <h2 className="mb-1 text-[15px] font-semibold">Authentication</h2>
        <p className="mb-4 text-[13px] text-t2">
          Create a key under <span className="font-mono text-lime">Settings → API Keys</span>. Keys
          are shown once and never again.
        </p>
        <CodePreview
          code={CURL}
          language="bash"
          className="overflow-x-auto rounded-[var(--radius-r2)] border border-b1 bg-s2 p-4 font-mono text-[12px] leading-[1.8] text-t2"
        />
      </section>

      <section>
        <h2 className="mb-4 text-[15px] font-semibold">Endpoints</h2>
        <div className="flex flex-col overflow-hidden rounded-[var(--radius-r2)] border border-b1">
          {ENDPOINTS.map((endpoint) => (
            <div
              key={endpoint.path}
              className="flex flex-col gap-1 border-b border-b1 px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
            >
              <span
                className={
                  endpoint.method === 'GET'
                    ? 'w-14 shrink-0 font-mono text-[11px] font-semibold text-cyan'
                    : endpoint.method === 'DELETE'
                      ? 'w-14 shrink-0 font-mono text-[11px] font-semibold text-red'
                      : 'w-14 shrink-0 font-mono text-[11px] font-semibold text-lime'
                }
              >
                {endpoint.method}
              </span>
              <span className="shrink-0 font-mono text-[12px] text-t1">{endpoint.path}</span>
              <span className="text-[12px] text-t3 sm:ml-auto sm:text-right">{endpoint.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}