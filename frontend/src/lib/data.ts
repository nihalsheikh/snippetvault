import type { Author, Comment, Snippet } from './types'

export const currentUser: Author = {
  id: 'u1',
  name: 'Nihal Sheikh',
  username: 'nihalsheikh',
  initials: 'NS',
}

export const authors: Record<string, Author> = {
  nihal: currentUser,
  aarav: {
    id: 'u2',
    name: 'Aarav Rao',
    username: 'aarav_r',
    initials: 'AR',
    avatarGradient: 'linear-gradient(135deg, var(--purple), var(--pink))',
  },
  priya: {
    id: 'u3',
    name: 'Priya Kulkarni',
    username: 'priya_k',
    initials: 'PK',
    avatarGradient: 'linear-gradient(135deg, var(--cyan), var(--lime))',
  },
  elena: {
    id: 'u4',
    name: 'Elena Novak',
    username: 'enovak',
    initials: 'EN',
  },
  marcus: {
    id: 'u5',
    name: 'Marcus Bell',
    username: 'mbell',
    initials: 'MB',
    avatarGradient: 'linear-gradient(135deg, var(--orange), var(--yellow))',
  },
}

const USE_DEBOUNCE = `import { useState, useEffect } from 'react'

/**
 * Debounce any value by a given delay.
 * Useful for search inputs, API calls on keystroke.
 */
export function useDebounce<T>(
  value: T,
  delay: number = 500
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(timer) // cleanup <- cursor here
  }, [value, delay])

  return debouncedValue
}`

const PYTHON_RETRY = `from functools import wraps
import time

def retry(n=3, delay=1.0, backoff=2):
    """Retry a function n times with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(n):
                try:
                    return func(*args, **kwargs)
                except Exception:
                    if attempt == n - 1:
                        raise
                    time.sleep(delay * (backoff ** attempt))
        return wrapper
    return decorator`

const JWT_MIDDLEWARE = `import jwt
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer

bearer = HTTPBearer()

async def auth_middleware(req: Request) -> dict:
    """Express/FastAPI middleware to verify JWT access tokens."""
    token = req.headers.get('authorization', '').split(' ')[1]
    try:
        payload = jwt.decode(token, SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, 'Token expired')
    req.state.user = payload['sub']
    return payload`

const RUST_WORKER = `use std::sync::mpsc::{channel, Receiver};
use std::thread;

#[derive(Debug)]
pub struct Job { pub id: u32, pub payload: String }

pub fn spawn_worker(rx: Receiver<Job>) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        while let Ok(job) = rx.recv() {
            println!("handling job {}", job.id);
        }
    })
}

fn main() {
    let (tx, rx) = channel();
    spawn_worker(rx);
}`

const PRISMA_PAGINATE = `type PaginateOptions = {
  cursor?: string
  take?: number
}

async function paginate<T>(
  model: any,
  cursor?: string,
  take = 20
) {
  return model.findMany({
    take,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  })
}`

const API_RESPONSE_TYPE = `type ApiResponse<T> = {
  data: T | null
  error?: string
  status: 200 | 400 | 500
}

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }`

const GO_WORKER = `func worker(ctx context.Context, jobs <-chan Job) {
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-jobs:
			if !ok {
				return
			}
			process(job)
		}
	}
}`

const RUST_STACK = `impl<T: Clone> Stack<T> {
    pub fn push(&mut self, v: T) {
        self.data.push(v)
    }

    pub fn pop(&mut self) -> Option<T> {
        self.data.pop()
    }
}`

const USE_DEBOUNCE_EXPLANATION = `This hook wraps React's useState and useEffect to delay updating a value until the input stops changing for delay ms. The cleanup function clears the previous timer on each render, ensuring only the final value triggers an update.

How it works: Each time value changes, useEffect sets a new timer. If value changes again before the timer fires, the previous timer is cleared by the cleanup function — restarting the clock.

Generic type T: Accepts any type — works for strings, numbers, or objects without casting.

Common use: Pair with a useEffect watching the returned value to fire an API call only when the user stops typing.`

const ZOD_VALIDATOR = `const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json(result.error.flatten())
    }
    req.body = result.data
    next()
  }`

const FASTAPI_DEPENDENCY = `async def get_db() -> AsyncGenerator:
    async with AsyncSession(engine) as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise`

const SERVER_ACTION = `'use server'

export async function createPost(
  prevState: State,
  formData: FormData
): Promise<State> {
  const parsed = PostSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input' }
  await db.post.create({ data: parsed.data })
  return { success: true }
}`

const RUST_ERROR_PROPAGATION = `fn read_config(path: &str) -> Result<Config, AppError> {
    let content = fs::read_to_string(path)?;
    let config: Config = serde_json::from_str(&content)?;
    Ok(config)
}`

const RECURSIVE_CTE = `WITH RECURSIVE tree AS (
  SELECT id, parent_id, name, 0 AS depth
  FROM categories
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, c.name, t.depth + 1
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
)
SELECT * FROM tree ORDER BY depth;`

const GO_GRACEFUL_SHUTDOWN = `quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

if err := srv.Shutdown(ctx); err != nil {
    log.Fatal(err)
}`

const TIMER_DECORATOR = `from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"{func.__name__}: {time.time() - start:.4f}s")
        return result
    return wrapper`

const GO_WITH_TIMEOUT = `func withTimeout(ctx context.Context, d time.Duration,
    fn func() error) error {
    ctx, cancel := context.WithTimeout(ctx, d)
    defer cancel()
    return fn()
}`

const DEBOUNCE_HOOK = `export function useDebounce<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => { /* ... */ }, [value, delay])
  return debounced
}`

const RETRY_SNIPPET = `def retry(n=3, delay=1.0):
    def decorator(func):
        def wrapper(*args):
            # retry logic
            return func(*args)
        return wrapper
    return decorator`

export const snippets: Snippet[] = [
  {
    id: 'use-debounce-hook',
    title: 'useDebounce hook',
    description: 'Debounce any value with configurable delay. Ideal for search inputs to avoid API calls on every keystroke.',
    code: USE_DEBOUNCE,
    language: 'typescript',
    tags: ['hooks', 'typescript', 'react', 'debounce'],
    visibility: 'public',
    author: authors.nihal,
    copies: 312,
    aiExplanation: USE_DEBOUNCE_EXPLANATION,
    createdAt: '2025-03-14T09:20:00Z',
    updatedAt: '2025-03-14T09:20:00Z',
  },
  {
    id: 'python-retry-decorator',
    title: 'Python retry decorator',
    description: 'Retry a function N times with exponential backoff',
    code: PYTHON_RETRY,
    language: 'python',
    tags: ['decorator', 'utils'],
    visibility: 'private',
    author: authors.nihal,
    copies: 0,
    createdAt: '2025-03-11T11:05:00Z',
    updatedAt: '2025-03-12T08:40:00Z',
  },
  {
    id: 'jwt-verify-middleware',
    title: 'JWT verify middleware',
    description: 'Express middleware to verify JWT access tokens',
    code: JWT_MIDDLEWARE,
    language: 'typescript',
    tags: ['express', 'jwt', 'auth'],
    visibility: 'public',
    author: authors.nihal,
    copies: 89,
    createdAt: '2025-03-09T16:30:00Z',
    updatedAt: '2025-03-13T10:12:00Z',
  },
  {
    id: 'rust-channel-worker',
    title: 'Rust channel worker',
    description: 'Thread-safe worker pool with MPSC channels',
    code: RUST_WORKER,
    language: 'rust',
    tags: ['concurrency', 'rust'],
    visibility: 'public',
    author: authors.nihal,
    copies: 44,
    createdAt: '2025-03-06T13:00:00Z',
    updatedAt: '2025-03-10T09:00:00Z',
  },
  {
    id: 'prisma-paginate-helper',
    title: 'Prisma paginate helper',
    description: 'Cursor-based pagination for Prisma queries',
    code: PRISMA_PAGINATE,
    language: 'typescript',
    tags: ['prisma', 'postgres'],
    visibility: 'public',
    author: authors.nihal,
    copies: 67,
    createdAt: '2025-03-02T17:45:00Z',
    updatedAt: '2025-03-02T17:45:00Z',
  },
  {
    id: 'api-response-type',
    title: 'ApiResponse generic type',
    description: 'Typed result union for API boundaries',
    code: API_RESPONSE_TYPE,
    language: 'typescript',
    tags: ['types', 'api'],
    visibility: 'public',
    author: authors.elena,
    copies: 234,
    isTrending: true,
    createdAt: '2025-02-27T12:00:00Z',
    updatedAt: '2025-03-08T12:00:00Z',
  },
  {
    id: 'python-retry-demo',
    title: 'Retry with backoff',
    description: 'Retry helper for flaky third-party calls',
    code: RETRY_SNIPPET,
    language: 'python',
    tags: ['decorator', 'utils'],
    visibility: 'public',
    author: authors.priya,
    copies: 189,
    isTrending: true,
    createdAt: '2025-02-25T10:10:00Z',
    updatedAt: '2025-03-07T10:10:00Z',
  },
  {
    id: 'go-worker-select',
    title: 'Go worker select loop',
    description: 'Fan out jobs with context cancellation',
    code: GO_WORKER,
    language: 'go',
    tags: ['concurrency'],
    visibility: 'public',
    author: authors.marcus,
    copies: 97,
    isTrending: true,
    createdAt: '2025-02-20T08:00:00Z',
    updatedAt: '2025-03-06T08:00:00Z',
  },
  {
    id: 'rust-generic-stack',
    title: 'Generic Stack impl',
    description: 'Minimal generic stack with push/pop',
    code: RUST_STACK,
    language: 'rust',
    tags: ['data-structures'],
    visibility: 'public',
    author: authors.aarav,
    copies: 312,
    isTrending: true,
    createdAt: '2025-02-18T14:20:00Z',
    updatedAt: '2025-03-05T14:20:00Z',
  },
  {
    id: 'zod-express-validator',
    title: 'Zod + Express validator',
    description: 'Type-safe request body validation middleware',
    code: ZOD_VALIDATOR,
    language: 'typescript',
    tags: ['zod', 'express'],
    visibility: 'public',
    author: authors.priya,
    copies: 2304,
    isTrending: true,
    createdAt: '2025-03-15T06:30:00Z',
    updatedAt: '2025-03-15T06:30:00Z',
  },
  {
    id: 'fastapi-dependency-injection',
    title: 'FastAPI dependency injection',
    description: 'Reusable DB session per request with cleanup',
    code: FASTAPI_DEPENDENCY,
    language: 'python',
    tags: ['fastapi', 'sqlalchemy'],
    visibility: 'public',
    author: authors.marcus,
    copies: 1876,
    isTrending: true,
    createdAt: '2025-03-14T07:15:00Z',
    updatedAt: '2025-03-14T07:15:00Z',
  },
  {
    id: 'nextjs-server-action',
    title: 'Next.js server action pattern',
    description: 'Form mutation with validation and error state',
    code: SERVER_ACTION,
    language: 'typescript',
    tags: ['nextjs', 'server-actions'],
    visibility: 'public',
    author: authors.elena,
    copies: 1432,
    isTrending: true,
    createdAt: '2025-03-13T09:45:00Z',
    updatedAt: '2025-03-13T09:45:00Z',
  },
  {
    id: 'rust-error-propagation',
    title: 'Rust error propagation',
    description: 'The ? operator with custom error types',
    code: RUST_ERROR_PROPAGATION,
    language: 'rust',
    tags: ['error-handling', 'rust'],
    visibility: 'public',
    author: authors.aarav,
    copies: 934,
    createdAt: '2025-03-10T15:00:00Z',
    updatedAt: '2025-03-10T15:00:00Z',
  },
  {
    id: 'postgres-recursive-cte',
    title: 'PostgreSQL recursive CTE',
    description: 'Tree structure query with parent-child hierarchy',
    code: RECURSIVE_CTE,
    language: 'sql',
    tags: ['sql', 'postgresql'],
    visibility: 'public',
    author: authors.priya,
    copies: 687,
    createdAt: '2025-03-08T11:30:00Z',
    updatedAt: '2025-03-08T11:30:00Z',
  },
  {
    id: 'go-graceful-shutdown',
    title: 'Go graceful shutdown',
    description: 'HTTP server shutdown with signal handling',
    code: GO_GRACEFUL_SHUTDOWN,
    language: 'go',
    tags: ['go', 'http', 'server'],
    visibility: 'public',
    author: authors.marcus,
    copies: 512,
    createdAt: '2025-03-05T13:55:00Z',
    updatedAt: '2025-03-05T13:55:00Z',
  },
  {
    id: 'python-timer-decorator',
    title: 'Python timer decorator',
    description: 'Time any function and print the elapsed time',
    code: TIMER_DECORATOR,
    language: 'python',
    tags: ['decorator', 'profiling'],
    visibility: 'public',
    author: authors.elena,
    copies: 847,
    createdAt: '2025-03-01T10:00:00Z',
    updatedAt: '2025-03-01T10:00:00Z',
  },
  {
    id: 'go-with-timeout',
    title: 'Go withTimeout helper',
    description: 'Run a function under a context deadline',
    code: GO_WITH_TIMEOUT,
    language: 'go',
    tags: ['context', 'timeouts'],
    visibility: 'public',
    author: authors.aarav,
    copies: 623,
    createdAt: '2025-02-28T16:20:00Z',
    updatedAt: '2025-02-28T16:20:00Z',
  },
  {
    id: 'use-throttle-hook',
    title: 'useThrottle hook',
    description: 'Throttle a value to fire at most once per interval',
    code: DEBOUNCE_HOOK.replace(/Debounce/g, 'Throttle').replace('Debounce any', 'Throttle any'),
    language: 'typescript',
    tags: ['hooks', 'react'],
    visibility: 'public',
    author: authors.nihal,
    copies: 189,
    createdAt: '2025-02-22T09:00:00Z',
    updatedAt: '2025-02-22T09:00:00Z',
  },
  {
    id: 'use-previous-hook',
    title: 'usePrevious hook',
    description: 'Return the previous value of a prop or state',
    code: DEBOUNCE_HOOK.replace(/Debounce/g, 'Previous').replace('Debounce any', 'Previous any'),
    language: 'typescript',
    tags: ['hooks', 'react'],
    visibility: 'public',
    author: authors.nihal,
    copies: 94,
    createdAt: '2025-02-19T09:00:00Z',
    updatedAt: '2025-02-19T09:00:00Z',
  },
]

export function getSnippet(id: string): Snippet | undefined {
  return snippets.find((s) => s.id === id)
}

export const mySnippets = snippets.filter((s) => s.author.id === currentUser.id)

export const trendingSnippets = snippets.filter((s) => s.isTrending)

export const publicSnippets = snippets.filter((s) => s.visibility === 'public')

export const similarTo = (snippet: Snippet, limit = 2): Snippet[] =>
  snippets
    .filter((s) => s.id !== snippet.id && s.language === snippet.language)
    .slice(0, limit)

export const commentsBySnippet: Record<string, Comment[]> = {
  'use-debounce-hook': [
    {
      id: 'c1',
      author: authors.aarav,
      body: 'This is exactly what I needed — the cleanup function is the part everyone forgets. Saved me from a nasty stale closure bug.',
      createdAt: '2025-03-16T10:00:00Z',
    },
    {
      id: 'c2',
      author: authors.priya,
      body: 'Would love to see a version with a leading-edge option (fire immediately, then debounce). Anyone have that?',
      createdAt: '2025-03-15T12:00:00Z',
    },
    {
      id: 'c3',
      author: authors.elena,
      body: 'Added a useDebouncedCallback variant in my own library if anyone wants the ref-based flavour.',
      createdAt: '2025-03-14T18:00:00Z',
    },
  ],
}

/** Snippet stats for the dashboard cards. */
export const dashboardStats = {
  totalSnippets: 48,
  totalSnippetsDelta: 3,
  totalCopies: 1284,
  totalCopiesDelta: 47,
  mostCopied: 'useDebounce',
  mostCopiedCount: 312,
  aiExplains: 23,
}

/** Per-language counts for the dashboard sidebar. */
export const languageCounts = [
  { language: 'typescript' as const, count: 18 },
  { language: 'python' as const, count: 14 },
  { language: 'rust' as const, count: 6 },
  { language: 'go' as const, count: 5 },
  { language: 'sql' as const, count: 5 },
]

export const libraryCounts = {
  all: 48,
  favourites: 12,
  public: 24,
  private: 24,
}

export const plan = { name: 'FREE PLAN', used: 48, limit: 100 }