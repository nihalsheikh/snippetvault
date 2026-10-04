"""Fill the database with a demo dataset.

Everything here is fabricated. No real person's address, name, or work appears in
this file, and every address sits on a domain reserved by RFC 2606, so none of them
can reach a real inbox.

Run it against a local database:

    python -m scripts.seed_demo_data

Run it against the deployed one by exporting `DATABASE_URL` first, so there is
no chance of the local `.env` pointing the seed at the wrong server:

    DATABASE_URL='postgresql://…' python -m scripts.seed_demo_data

The script is idempotent-ish: it skips a user whose email already exists rather
than failing on the unique index, so a second run tops up instead of duplicating.
It never deletes anything — pass `--reset` to drop the demo rows first.
"""

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone

from database.db import Base, engine, session_local
from models import (
    Collection,
    CollectionSnippet,
    Comment,
    Snippet,
    SnippetBookmark,
    SnippetTag,
    Tag,
    User,
)

from auth.hash_password import hash_password
from utils.moderation import screen_comment
from utils.username import sanitize_username

# A fixed seed so a re-run produces the same copy counts and dates. Without it
# every run reshuffles which snippet is "trending", which makes it impossible to
# tell a data change from a random one.
RNG = random.Random(20261003)

# Each demo account carries its own address, carried on its USERS entry rather than
# generated from a shared base. Two reasons:
#
#   * `example.com`, `example.net`, `example.org` and `example.dev` are reserved by
#     RFC 2606 specifically so they can never resolve to a real mailbox. If someone
#     clicks "forgot password" on a demo account, the mail goes nowhere — it cannot
#     land in a stranger's inbox.
#   * A shared domain with a `+N` suffix looks like a real person's address and reads
#     as one in a screenshot. Unique, obviously-fake addresses look like what they are.
#
# The seed never sends mail either way; these exist to be unique keys.

DEMO_PASSWORD = "John#123"


# ---------------------------------------------------------------- demo users

USERS = [
    {
        "name": "Ada Lovelace",
        "username": "ada",
        "email": "ada.lovelace@example.com",
        "bio": "Writing notes on analytical engines. Mostly here for the SQL.",
        "website": "https://example.com/ada",
        "verified": True,
        "age_days": 410,
    },
    {
        "name": "Grace Hopper",
        "username": "grace",
        "email": "grace.hopper@example.net",
        "bio": "Compilers, and the occasional nanosecond.",
        "website": None,
        "verified": True,
        "age_days": 395,
    },
    {
        "name": "Alan Turing",
        "username": "alan",
        "email": "alan.turing@example.org",
        "bio": "Decidability, cryptography, and long walks.",
        "website": "https://example.com/alan",
        "verified": True,
        "age_days": 380,
    },
    {
        "name": "Katherine Johnson",
        "username": "katherine",
        "email": "katherine.johnson@example.dev",
        "bio": "Trajectories. Numerical methods fan.",
        "website": None,
        "verified": True,
        "age_days": 360,
    },
    {
        "name": "Linus Torvalds",
        "username": "linus",
        "email": "linus.torvalds@example.com",
        "bio": "Kernel poking. I will bikeshed your code style.",
        "website": "https://example.com/linus",
        "verified": True,
        "age_days": 340,
    },
    {
        "name": "Barbara Liskov",
        "username": "barbara",
        "email": "barbara.liskov@example.net",
        "bio": "Substitution over inheritance. Always.",
        "website": None,
        "verified": True,
        "age_days": 320,
    },
    {
        "name": "Donald Knuth",
        "username": "knuth",
        "email": "donald.knuth@example.org",
        "bio": "Literate programming apologist. Yes, really.",
        "website": "https://example.com/knuth",
        "verified": True,
        "age_days": 300,
    },
    {
        "name": "Radia Perlman",
        "username": "radia",
        "email": "radia.perlman@example.dev",
        "bio": "Networks that route around damage.",
        "website": None,
        "verified": True,
        "age_days": 280,
    },
    {
        "name": "Margaret Hamilton",
        "username": "margaret",
        "email": "margaret.hamilton@example.com",
        "bio": "Software engineering. The rest is detail.",
        "website": "https://example.com/margaret",
        "verified": True,
        "age_days": 250,
    },
    {
        "name": "Tim Berners-Lee",
        "username": "timbl",
        "email": "timbl@example.net",
        "bio": "Open by default.",
        "website": None,
        "verified": True,
        "age_days": 220,
    },
    {
        "name": "Anita Borg",
        "username": "anita",
        "email": "anita.borg@example.org",
        "bio": "Systems programming, and getting more people into it.",
        "website": None,
        "verified": True,
        "age_days": 190,
    },
    {
        "name": "Jean Bartik",
        "username": "jean",
        "email": "jean.bartik@example.dev",
        "bio": "ENIAC. The good old days.",
        "website": "https://example.com/jean",
        "verified": True,
        "age_days": 160,
    },
    {
        "name": "Karen Spärck Jones",
        "username": "karen",
        "email": "karen.sparckjones@example.com",
        "bio": "Information retrieval. IDF was mine.",
        "website": None,
        "verified": True,
        "age_days": 130,
    },
    {
        "name": "Guido van Rossum",
        "username": "guido",
        "email": "guido.vanrossum@example.net",
        "bio": "Python. Also BDFL-adjacent, reluctantly.",
        "website": None,
        "verified": True,
        "age_days": 100,
    },
    {
        "name": "Bjarne Stroustrup",
        "username": "bjarne",
        "email": "bjarne.stroustrup@example.org",
        "bio": "Zero-cost abstractions. Zero overhead, not zero complexity.",
        "website": "https://example.com/bjarne",
        "verified": True,
        "age_days": 70,
    },
    {
        "name": "Anders Hejlsberg",
        "username": "anders",
        "email": "anders.hejlsberg@example.dev",
        "bio": "Type systems that keep quiet while they work.",
        "website": None,
        "verified": True,
        "age_days": 40,
    },
]


# ---------------------------------------------------------------- demo snippets

# (title, language, description, tags, code, public, ai_explanation)
#
# Every snippet that carries an `ai_explanation` is one the app can plausibly have
# explained already — the field is only ever written by the AI route, so a seeded
# value is indistinguishable from a real one. The rest are left null so the
# "Explain with AI" panel's empty state still has something to show.
SNIPPETS = [
    {
        "title": "FastAPI app with a lifespan hook",
        "language": "Python",
        "description": "Startup and shutdown without the deprecated @app.on_event.",
        "tags": ["python", "fastapi", "async"],
        "public": True,
        "code": '''from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once before the first request is served...
    pool = await open_pool()
    app.state.db = pool
    yield
    # ...and this runs on shutdown, even if a request raised.
    await pool.close()


app = FastAPI(lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
''',
        "ai": (
            "The `lifespan` argument is an async context manager, so the code before "
            "the `yield` runs at startup and the code after it runs at shutdown. It "
            "replaces `@app.on_event`, which FastAPI deprecated because those handlers "
            "cannot be cancelled cleanly and made shutdown ordering ambiguous. A "
            "resource opened before the `yield` and closed after it is released even "
            "if startup fails partway, because the generator's `finally` semantics still "
            "apply."
        ),
    },
    {
        "title": "Retry with exponential backoff and jitter",
        "language": "Python",
        "description": "The jitter matters more than the backoff.",
        "tags": ["python", "async", "resilience"],
        "public": True,
        "code": '''import random
from typing import Awaitable, Callable, TypeVar

T = TypeVar("T")


async def retry(
    fn: Callable[[], Awaitable[T]],
    attempts: int = 5,
    base_delay: float = 0.2,
) -> T:
    last: Exception | None = None

    for attempt in range(attempts):
        try:
            return await fn()
        except Exception as exc:  # noqa: BLE001 - caller decides what is retryable
            last = exc
            if attempt == attempts - 1:
                break
            # Full jitter. Without the random term every client that failed at the
            # same instant retries at the same instant, forever.
            delay = random.random() * base_delay * (2**attempt)
            await asyncio.sleep(delay)

    assert last is not None
    raise last
''',
        "ai": (
            "Each retry waits a random fraction of the exponentially growing window "
            "rather than the window itself — this is \"full jitter\" and it is what "
            "stops a thundering herd. If every client backed off by exactly two seconds, "
            "a thousand clients that failed together would retry together and knock the "
            "service over again. Randomising within the window spreads them out. The "
            "loop re-raises the final exception rather than returning `None`, so a "
            "caller cannot mistake exhaustion for a successful `None`."
        ),
    },
    {
        "title": "Debounce a value in React",
        "language": "TypeScript",
        "description": "For search boxes and resize handlers, not for data fetching.",
        "tags": ["react", "hooks", "typescript"],
        "public": True,
        "code": '''import { useEffect, useState } from 'react'

/** Returns `value` only after it has stopped changing for `delay` ms. */
export function useDebounce<T>(value: T, delay = 500): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    // Clearing on every keystroke is the whole mechanism: the previous timer never
    // fires, so only the last one survives.
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
''',
        "ai": (
            "The effect re-runs on every change to `value`, and its cleanup clears the "
            "timer it created last time. So each keystroke cancels the pending update "
            "and schedules a new one; only when typing stops for `delay` milliseconds "
            "does the surviving timer fire. This is debouncing — collapsing a burst of "
            "events into one. It is not throttling (allowing an event at most once per "
            "interval) and not a substitute for cancellation in data fetching, where "
            "you want an AbortController on the request itself."
        ),
    },
    {
        "title": "Flatten a nested list one level",
        "language": "JavaScript",
        "description": "ES2019. No polyfill needed on any current browser.",
        "tags": ["javascript", "arrays"],
        "public": True,
        "code": '''const nested = [1, [2, 3], [[4], 5], 6]

const flat = nested.flat()
// [1, 2, 3, [4], 5, 6]

// Depth is configurable, but `flat(Infinity)` is a smell — it can blow the stack
// on a cyclic structure and it hides the shape you are actually working with.
const deeper = nested.flat(2)
// [1, 2, 3, [4], 5, 6]
''',
        "ai": (
            "`Array.prototype.flat` collapses nested arrays into a single array up to "
            "the given depth, defaulting to 1. Depth 1 removes one level, so the doubly "
            "nested `[4]` survives. It was standardised in ES2019, so it needs no "
            "polyfill in any browser that supports it. `flat(Infinity)` flattens "
            "completely but is discouraged: it is easy to write by accident, it gives no "
            "signal about the structure you expected, and on a self-referencing array it "
            "will recurse without bound."
        ),
    },
    {
        "title": "Postgres upsert on a composite conflict target",
        "language": "SQL",
        "description": "DO UPDATE, not DO NOTHING, when the new row is the better one.",
        "tags": ["sql", "postgres", "database"],
        "public": True,
        "code": '''INSERT INTO snippet_tags (snippet_id, tag_id)
VALUES (:snippet, :tag)
ON CONFLICT (snippet_id, tag_id) DO UPDATE
SET created_at = EXCLUDED.created_at
RETURNING id;
''',
        "ai": (
            "`ON CONFLICT` makes the insert idempotent by turning a unique-violation "
            "into something the statement handles itself. The `(snippet_id, tag_id)` "
            "column list is the *conflict target* — it must match a unique index, or "
            "Postgres cannot tell which constraint is being violated. `DO NOTHING` "
            "silently skips the row and returns nothing; `DO UPDATE` runs the `SET` "
            "clause, and `EXCLUDED` refers to the row that failed to insert. Note that "
            "`RETURNING` yields a row on insert and on update, but not on `DO NOTHING`."
        ),
    },
    {
        "title": "Group by day without losing the timezone",
        "language": "SQL",
        "description": "date_trunc on a timestamptz buckets in UTC, not local time.",
        "tags": ["sql", "postgres", "timezone"],
        "public": True,
        "code": '''SELECT
    date_trunc('day', created_at AT TIME ZONE 'UTC') AS day,
    COUNT(*) AS copies
FROM snippets
WHERE copy_count > 0
GROUP BY day
ORDER BY day DESC
LIMIT 30;
''',
        "ai": (
            "`date_trunc` truncates a timestamp to the given precision, so it is the "
            "standard way to bucket rows by hour or day. The subtlety is `AT TIME ZONE "
            "'UTC'`: applied to a `timestamptz`, it converts to a plain `timestamp` in "
            "that zone, and truncating *that* buckets the calendar day in UTC. Skipping "
            "the conversion and truncating the `timestamptz` directly buckets in the "
            "session's `TimeZone` setting, which means the same query returns different "
            "buckets on different servers."
        ),
    },
    {
        "title": "Read a file line by line without loading it",
        "language": "Python",
        "description": "For files that do not fit in memory.",
        "tags": ["python", "files", "performance"],
        "public": True,
        "code": '''from pathlib import Path


def lines(path: Path):
    # A 4 GB log and a 4 KB one cost the same here: the file is never read whole.
    with path.open("r", encoding="utf-8", errors="replace") as fh:
        yield from fh


for number, line in enumerate(lines(Path("access.log")), start=1):
    if " 500 " in line:
        print(number, line.rstrip())
''',
        "ai": (
            "Iterating a file handle yields one line at a time and holds only the "
            "current line in memory, so a multi-gigabyte file costs the same as a small "
            "one. `errors=\"replace\"` substitutes undecodable bytes instead of raising, "
            "which matters for log files written by many processes that may not all be "
            "sending valid UTF-8. `yield from fh` inside the `with` block keeps the file "
            "closed when the generator is exhausted or garbage collected."
        ),
    },
    {
        "title": "Tail a file and keep following it",
        "language": "Bash",
        "description": "The -F flag survives a log rotation.",
        "tags": ["bash", "linux", "ops"],
        "public": True,
        "code": '''#!/usr/bin/env bash
set -euo pipefail

LOG="${1:-/var/log/app.log}"

# -F is --follow=name --retry: it re-opens the file if it is rotated or deleted,
# which plain -f does not do. Without it, tail exits silently after a logrotate run
# and you are staring at a frozen file believing the app is idle.
tail -F "$LOG"
''',
        "ai": (
            "`tail -f` follows a file by *name*, but it opens it once. When logrotate "
            "renames the file and creates a new one at the same path, `tail` is still "
            "reading the renamed inode and misses every subsequent line. `-F` "
            "(`--follow=name --retry`) re-checks the path periodically and reopens it "
            "when the inode changes, and `--retry` keeps it alive through a delay in "
            "which the file does not exist at all. `set -euo pipefail` makes an unset "
            "variable or a failed pipeline abort the script instead of continuing with "
            "garbage."
        ),
    },
    {
        "title": "Find the ten largest files in a tree",
        "language": "Bash",
        "description": "du plus sort. Watch out for what find is allowed to touch.",
        "tags": ["bash", "linux"],
        "public": True,
        "code": '''du -ah . 2>/dev/null \\
  | sort -rh \\
  | head -10 \\
  | awk '{ printf "%8.1f MB  %s\\n", $1/1024, $2 }'
''',
        "ai": (
            "`du -ah` reports every file and directory with its size in blocks, `-r` "
            "sorts those strings in reverse human-readable order so `9.9G` outranks "
            "`900M`, and `head` takes the top ten. The `awk` layer converts the block "
            "count back into megabytes, because `du` reports in 1K blocks by default. "
            "The `2>/dev/null` matters on a large tree: without it `du` prints a "
            "permission error for every directory you cannot read, and those lines sort "
            "into the output as if they were results."
        ),
    },
    {
        "title": "Closeable trait in Rust",
        "language": "Rust",
        "description": "The pattern behind Option, Result, and MutexGuard.",
        "tags": ["rust", "traits", "memory"],
        "public": True,
        "code": '''use std::fmt::Debug;

pub struct Guard<'a, T> {
    resource: &'a mut T,
}

impl<T> Drop for Guard<'_, T> {
    fn drop(&mut self) {
        // Runs however the guard leaves scope: normal exit, an early `return`,
        // or an unwinding panic.
        self.resource.flush();
    }
}

impl<T: Debug> std::fmt::Display for Guard<'_, T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self.resource)
    }
}
''',
        "ai": (
            "Implementing `Drop` gives a type cleanup that runs on every exit path, "
            "including an early return and an unwinding panic — which is exactly the "
            "guarantee `MutexGuard` and `File` rely on, and the reason Rust needs no "
            "`finally`. The lifetime `'a` ties the guard to the borrow it holds, so the "
            "borrow checker rejects any code that keeps the guard alive past the "
            "resource it guards. Note that `Drop::drop` takes `&mut self` and cannot be "
            "called explicitly; it runs when the value goes out of scope."
        ),
    },
    {
        "title": "Ownership and borrowing in one function",
        "language": "Rust",
        "description": "The borrow checker as a documentation feature.",
        "tags": ["rust", "ownership"],
        "public": True,
        "code": '''fn longest_within<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

// This will not compile:
//   let s = String::from("hi");
//   let r = s;
//   println!("{s}");   // borrow of moved value: `s`
//
// The error is the point. `s` cannot be read here because `r` may free it, so the
// compiler is enforcing that exactly one owner is responsible for the allocation.
''',
        "ai": (
            "Rust has one owner per value; assigning to a new binding moves it and "
            "invalidates the old name. The error in the commented block is the compiler "
            "telling you `s` no longer refers to anything, because `r` now does. This is "
            "not a restriction to work around — it makes the point of deallocation "
            "statically obvious, so there is no double free and no leak from a forgotten "
            "free. The lifetime `'a` on the return type says the returned reference is "
            "valid for as long as *both* inputs, which is what lets the caller hold it "
            "without the inputs being freed underneath."
        ),
    },
    {
        "title": "A Go worker pool with a bounded queue",
        "language": "Go",
        "description": "Bounded so a slow consumer applies backpressure.",
        "tags": ["go", "concurrency"],
        "public": True,
        "code": '''package pool

import "sync"

func Run(jobs <-chan Job, workers int) {
    var wg sync.WaitGroup

    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for job := range jobs {
                job.Handle()
            }
        }()
    }

    // Ranges until the channel is *closed*, not while it is empty — a receive on an
    // open-but-idle channel blocks, which is what keeps these goroutines parked
    // instead of spinning.
    wg.Wait()
}
''',
        "ai": (
            "`workers` goroutines each loop over the same channel. Receiving from an open "
            "channel with nothing in it *blocks*, so an idle worker parks rather than "
            "spinning the CPU — that is the key property that makes this pattern "
            "efficient. `wg.Wait()` returns once the channel is closed and drained, "
            "because `range` over a channel ends on close rather than on emptiness. "
            "`defer wg.Done()` runs on every exit including a panic, so a panicking job "
            "cannot leave the WaitGroup permanently short."
        ),
    },
    {
        "title": "Error handling that keeps the context",
        "language": "Go",
        "description": "Wrapping is what makes a stack trace readable.",
        "tags": ["go", "error-handling"],
        "public": True,
        "code": '''package store

import (
    "context"
    "fmt"
)

func (s *Store) Get(ctx context.Context, id string) (*Item, error) {
    if err := ctx.Err(); err != nil {
        return nil, fmt.Errorf("store.get %q: %w", id, err)
    }

    item, err := s.query(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("store.get %q: %w", id, err)
    }
    return item, nil
}

// `%w` wraps: callers can still errors.Is/As against the cause, which is what
// lets a caller check for context.DeadlineExceeded without string matching.
''',
        "ai": (
            "The `%w` verb wraps the underlying error instead of flattening it to a "
            "string. The message gains the operation and the id — which is what makes a "
            "log line readable — while the chain stays intact, so `errors.Is(err, "
            "context.DeadlineExceeded)` still works at the top of the call stack. Using "
            "`%v` or `.Error()` instead would discard the cause and force callers into "
            "string matching, which breaks the moment the message changes. Checking "
            "`ctx.Err()` up front turns a slow query into an immediate, clearly "
            "attributed failure rather than a hang."
        ),
    },
    {
        "title": "A minimal Express error handler",
        "language": "JavaScript",
        "description": "Four arguments is what marks it as an error handler to Express.",
        "tags": ["javascript", "node", "express"],
        "public": True,
        "code": '''app.use((err, req, res, next) => {
  // Four parameters. Drop `next` and Express treats this as ordinary middleware,
  // which is the single most common reason a global error handler never fires.
  if (res.headersSent) {
    return next(err)
  }

  const status = err.status ?? 500
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  })
})
''',
        "ai": (
            "Express identifies an error handler by arity: exactly four parameters, "
            "`(err, req, res, next)`. Remove one and it is treated as normal middleware "
            "and never runs on an error. Once headers are on the wire you cannot send a "
            "JSON body any more, so the only correct move is to delegate to `next(err)` "
            "and let Express close the connection. The `?? 500` and the split between "
            "`err.message` and a generic string keep internal failure detail out of the "
            "response while still logging the real error server-side."
        ),
    },
    {
        "title": "Debounce and throttle are not the same thing",
        "language": "JavaScript",
        "description": "One waits for quiet, the other paces.",
        "tags": ["javascript", "performance"],
        "public": True,
        "code": '''function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function throttle(fn, ms) {
  let last = 0
  let queued = null
  return (...args) => {
    const now = Date.now()
    const wait = ms - (now - last)
    if (wait <= 0) {
      last = now
      fn(...args)
    } else if (!queued) {
      // One trailing call, so the final state is never dropped.
      queued = setTimeout(() => {
        last = Date.now()
        queued = null
        fn(...args)
      }, wait)
    }
  }
}
''',
        "ai": (
            "Debouncing waits for the burst to end: each call cancels the pending one, so "
            "the function runs once, `ms` after the last event. Throttling paces: it runs "
            "at most once per `ms` window regardless of how many events arrive. Use "
            "debounce for \"the user stopped typing\" and throttle for scroll or resize "
            "handlers, where you want a steady update rate and dropping intermediate "
            "frames is fine. The trailing call in the throttle matters — without it, the "
            "last event of a burst is discarded and the UI can settle on a stale value."
        ),
    },
    {
        "title": "CSS grid that actually centres",
        "language": "CSS",
        "description": "place-items beats margin auto and flex gymnastics.",
        "tags": ["css", "layout", "frontend"],
        "public": True,
        "code": ''.join([
            ".card {\n",
            "  display: grid;\n",
            "  place-items: center;\n",
            "  min-height: 240px;\n",
            "}\n",
            "\n",
            "/* Three columns that collapse to one on their own. No media query:\n",
            "   `auto-fit` + `minmax` is a responsive grid in two declarations. */\n",
            ".gallery {\n",
            "  display: grid;\n",
            "  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n",
            "  gap: 1rem;\n",
            "}",
        ]),
        "ai": (
            "`place-items: center` is shorthand for `align-items` and `justify-items`, so "
            "it centres in both axes in one declaration. For the grid, "
            "`repeat(auto-fit, minmax(220px, 1fr))` asks for as many 220px-minimum columns "
            "as fit, sharing leftover space evenly; `auto-fit` collapses empty tracks so "
            "a single item stretches full width rather than staying 220px. The practical "
            "difference from `auto-fill`: `auto-fill` keeps the empty tracks, so one item "
            "sits at the left in a grid sized for eight. This replaces what would "
            "otherwise be a media query."
        ),
    },
    {
        "title": "Centring that always works",
        "language": "CSS",
        "description": "Three techniques, and when each one is the right pick.",
        "tags": ["css", "layout"],
        "public": True,
        "code": ''.join([
            "/* 1. Grid — the default answer. Two declarations, no magic numbers. */\n",
            ".center { display: grid; place-items: center; }\n",
            "\n",
            "/* 2. Flex — when the parent is already a flex container. */\n",
            ".center-flex { display: flex; align-items: center; justify-content: center; }\n",
            "\n",
            "/* 3. Absolute + transform — centres relative to the *viewport*,\n",
            "   and the only one that survives scrolling. */\n",
            ".modal {\n",
            "  position: fixed;\n",
            "  inset: 0;\n",
            "  display: grid;\n",
            "  place-items: center;\n",
            "}",
        ]),
        "ai": (
            "Grid with `place-items` is the shortest and handles both axes at once. Flex "
            "is the right pick only when the container is already flex, since switching "
            "to grid would disturb its other children. The old absolute-plus-negative-"
            "margin technique needs a known height and breaks the moment the content "
            "changes size; `inset: 0` with grid replaces it. `transform: translate(-50%, "
            "-50%)` still appears in older code for absolutely positioned elements, but "
            "it is only needed when the element cannot be a grid or flex item."
        ),
    },
    {
        "title": "Named arguments in a dataclass",
        "language": "Python",
        "description": "Field order stops mattering the moment you add a second one.",
        "tags": ["python", "dataclasses", "patterns"],
        "public": True,
        "code": '''from dataclasses import dataclass, field


@dataclass(slots=True)
class Config:
    host: str = "localhost"
    port: int = 8080
    debug: bool = False
    tags: list[str] = field(default_factory=list)


c = Config(port=3000, debug=True)
# Config(host='localhost', port=3000, debug=True, tags=[])
''',
        "ai": (
            "A dataclass generates `__init__` from the annotated fields, so every field "
            "with a default is optional and keyword arguments work for all of them. "
            "`field(default_factory=list)` is required rather than a plain `= []`, "
            "because a mutable default would be shared across every instance. `slots=True` "
            "generates `__slots__`, which cuts per-instance memory and catches typos in "
            "attribute names at assignment time — at the cost of no dynamically added "
            "attributes. The failure mode to watch for is inserting a field in the middle "
            "of the list: positional callers silently get the wrong value, which is why "
            "passing by keyword is the convention."
        ),
    },
    {
        "title": "Sorting a dict by value",
        "language": "Python",
        "description": "For when you need the result back as a dict.",
        "tags": ["python", "collections"],
        "public": False,
        "code": '''scores = {"ada": 12, "grace": 31, "alan": 8}

top = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
# [('grace', 31), ('ada', 12), ('alan', 8)]

# Back to a dict. Plain `sorted(scores)` would sort the *keys*, which is a
# surprisingly common bug when the values are what you meant.
by_score = dict(top)
# {'grace': 31, 'ada': 12, 'alan': 8}
''',
        "ai": (
            "`sorted` on a dict iterates its keys, so `sorted(scores)` sorts the names "
            "alphabetically and silently ignores the values — the classic mistake here. "
            "Iterating `.items()` and keying on the second element sorts by value; "
            "`reverse=True` flips the comparison rather than reversing afterwards, which "
            "keeps stability. `dict(top)` rebuilds a mapping that iterates in that order "
            "because dicts preserve insertion order. On Python 3.7+ the alternative "
            "shorthand is `dict(sorted(scores.items(), key=itemgetter(1), reverse=True))` "
            "with `operator.itemgetter`, which is faster than the lambda for hot loops."
        ),
    },
    {
        "title": "Union types and narrowing",
        "language": "TypeScript",
        "description": "The type guard is the feature, not the annotation.",
        "tags": ["typescript", "types"],
        "public": False,
        "code": '''type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

function unwrap<T>(r: Result<T>, fallback: T): T {
  // The discriminant is what makes this narrow. Without `r.ok` as a literal
  // boolean, `r.value` is a compile error on the false branch.
  if (r.ok) return r.value
  return fallback
}

const good = unwrap<number>({ ok: true, value: 42 }, 0)   // number
const bad = unwrap<number>({ ok: false, error: 'x' }, 0)    // number
''',
        "ai": (
            "A discriminated union models 'one of these shapes' so the compiler can "
            "refuse impossible combinations — `{ok: true, error: 'x'}` will not typecheck, "
            "which is the entire point. `ok` is a literal type rather than `boolean`, and "
            "checking it narrows the union to one member, so `r.value` becomes accessible "
            "inside the `if`. The error message for a missed narrowing names the property "
            "that would discriminate, which is usually the hint you need. Runtime data "
            "still has to be validated — TypeScript types vanish at runtime — so an API "
            "response needs a parser before it can be trusted as a `Result<T>`."
        ),
    },
    {
        "title": "Git: undo the last commit, keeping the changes",
        "language": "Bash",
        "description": "The three resets, and which one you want.",
        "tags": ["git", "bash", "version-control"],
        "public": False,
        "code": '''# Keep the changes, drop the commit. The usual "wrong commit message" fix.
git reset --soft HEAD~1

# Keep the changes, drop the commit AND the staging area.
git reset --mixed HEAD~1     # this is plain `git reset`

# Throw the commit away entirely. The changes are gone unless you stashed first.
git reset --hard HEAD~1     # --hard deletes uncommitted work too

# Revert without rewriting history — the only safe option on a shared branch,
# because it adds a new commit rather than removing one.
git revert HEAD
''',
        "ai": (
            "The three modes differ only in what happens to the index and the working "
            "tree. `--soft` moves HEAD and leaves both staged, so `git commit --amend` or "
            "a re-commit picks up exactly the same content. `--mixed` (the default) also "
            "unstages, so the changes show up as unstaged modifications. `--hard` resets "
            "all three, which discards any uncommitted work that was not part of the "
            "commit — the reason to reach for it last. `git revert` is the exception: it "
            "records a new commit that undoes the old one, so anyone who already pulled "
            "is not left with a diverged history."
        ),
    },
    {
        "title": "A responsive table without a framework",
        "language": "CSS",
        "description": "data-label plus a block layout under the breakpoint.",
        "tags": ["css", "responsive", "frontend"],
        "public": False,
        "code": ''.join([
            "@media (max-width: 640px) {\n",
            "  table, thead, tbody, tr, th, td { display: block; }\n",
            "\n",
            "  thead { position: absolute; width: 1px; height: 1px; overflow: hidden; }\n",
            "\n",
            "  tr { border-bottom: 1px solid var(--b1); padding: 0.5rem 0; }\n",
            "\n",
            "  td { display: flex; justify-content: space-between; }\n",
            "  td::before {\n",
            "    content: attr(data-label);   /* the label lives in the markup */\n",
            "    font-weight: 600;\n",
            "    color: var(--t3);\n",
            "  }\n",
            "}",
        ]),
        "ai": (
            "Each `<td>` carries a `data-label` attribute holding its column heading, and "
            "`td::before` injects it as generated content under the breakpoint. Turning "
            "every table element into a block collapses the table layout, so each row "
            "becomes a card with stacked label/value pairs. The `thead` is hidden with the "
            "standard visually-hidden pattern rather than `display: none`, which would "
            "remove the headings from the accessibility tree along with the pixels — a "
            "screen reader would announce a bare list of numbers. No JavaScript is "
            "involved, and the table reverts to normal above 640px."
        ),
    },
    {
        "title": "Idempotent shell script",
        "language": "Bash",
        "description": "Safe to run twice, which is the property that matters.",
        "tags": ["bash", "devops", "automation"],
        "public": False,
        "code": '''#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\\t'

CONFIG="${1:-./app.conf}"

if [[ ! -f "$CONFIG" ]]; then
  echo "no config at $CONFIG" >&2
  exit 1
fi

# Re-read on every run; do not trust a cached copy from an earlier invocation.
mkdir -p ./state
cp -f "$CONFIG" ./state/config.bak

# `flock` serialises concurrent runs instead of letting them interleave writes.
flock -n 9 || { echo "another run is in progress" >&2; exit 1; }
9>./state/lock

echo "ok: $CONFIG"
''',
        "ai": (
            "`set -euo pipefail` turns three separate classes of silent failure into "
            "loud ones: a command exiting non-zero, an unset variable expanding to "
            "empty, and a pipeline whose earlier stage failed but whose last stage "
            "succeeded. Restricting `IFS` to newline and tab stops word-splitting bugs "
            "where a filename contains a space. `flock` with a non-blocking `-n` takes an "
            "exclusive lock on a file descriptor, so a second concurrent run exits "
            "instead of racing the first — the difference between an idempotent script "
            "and one that is merely repeatable. Re-reading configuration each run, "
            "rather than trusting a cached copy, is what lets the same command be the "
            "recovery path."
        ),
    },
    {
        "title": "CORS preflight, and when it happens",
        "language": "JavaScript",
        "description": "Why the browser asks twice, and what the OPTIONS response needs.",
        "tags": ["javascript", "http", "cors"],
        "public": False,
        "code": '''// Preflight — the browser sends this itself, before the real request,
// because the real one is not a CORS-safelisted request.
res.headers.set("Access-Control-Allow-Origin", "https://snippetvault-jet.vercel.app")
res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE")
res.headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type")
res.headers.set("Access-Control-Max-Age", "600")   // cache it; skip the next round trip
res.headers.set("Vary", "Origin")
''',
        "ai": (
            "A preflight is an `OPTIONS` request the browser sends automatically when the "
            "real request uses a method or header outside the safelist — `Authorization` "
            "is the usual trigger, as is `Content-Type: application/json`. The server's "
            "OPTIONS response must allow the origin, the method, and every header the real "
            "request will send; anything missing fails here and the real request never "
            "leaves the browser. `Access-Control-Max-Age` caches the preflight for that "
            "many seconds, so it costs one extra round trip per header change rather than "
            "one per request. `Vary: Origin` matters whenever the allowed origin is "
            "dynamic — without it a shared cache can serve one origin's response to "
            "another."
        ),
    },
    {
        "title": "Named capture groups",
        "language": "Python",
        "description": "Readability over backreference indices.",
        "tags": ["python", "regex"],
        "public": False,
        "code": '''import re

LOG = re.compile(r"""
    (?P<level>DEBUG|INFO|WARN|ERROR)   # named, so the group is self-describing
    \\s+
    \\[(?P<service>[\\w.-]+)\\]           # the emitting service
    \\s+
    (?P<message>.*)                     # everything else is the message
""", re.VERBOSE)

m = LOG.match("2026-01-01 ERROR [billing] card declined")
if m:
    print(m["service"])   # billing
    print(m["message"])   # card declined
    # `groupdict()` gives the whole mapping when you want to pass it along.
''',
        "ai": (
            "Named groups make a pattern readable months later, because `m['service'] "
            "says what it is where `m.group(2)` does not. `re.VERBOSE` lets the pattern "
            "span multiple lines and carry comments, with whitespace in the pattern "
            "ignored — which also means a literal space must be written `\\s` or `[ ]`, "
            "since the space you type for readability is not part of the match. "
            "`groupdict()` returns every named group as a dict, which is usually what you "
            "want to hand to a logger. Adding a group in the middle renumbers every "
            "positional group after it, which is the other reason names are worth the "
            "typing."
        ),
    },
    {
        "title": "Fernet: symmetric encryption done correctly",
        "language": "Python",
        "description": "For secrets that need to come back out as plaintext.",
        "tags": ["python", "cryptography", "security"],
        "public": False,
        "code": '''from cryptography.fernet import Fernet

key = Fernet.generate_key()          # 32 url-safe base64 bytes; store in a secret store
f = Fernet(key)

token = f.encrypt(b"api-key-1234")   # authenticated: tampering raises on decrypt
assert f.decrypt(token) == b"api-key-1234"

# Fernet is symmetric, so it cannot *sign*. Use an asymmetric primitive when the
# verifier must not be able to produce the ciphertext — a signed JWT, or Ed25519.
''',
        "ai": (
            "Fernet is authenticated encryption: AES-128-CBC for confidentiality with "
            "an HMAC-SHA256 tag over the ciphertext, so a modified token fails to decrypt "
            "rather than returning corrupted plaintext. Tokens embed a timestamp and "
            "carry their own IV, and the token also authenticates that timestamp, so an "
            "attacker cannot extend a token's life by editing the expiry. Because the "
            "same key both encrypts and decrypts, anyone holding it can also *create* "
            "valid tokens — that rules it out for anything where a verifier must not be "
            "able to forge, such as a signed webhook or a session token a third party "
            "validates. Ed25519 or a JWT is the right tool there."
        ),
    },
    {
        "title": "Two-way binding without a framework",
        "language": "TypeScript",
        "description": "classList beats className for anything conditional.",
        "tags": ["typescript", "dom", "frontend"],
        "public": False,
        "code": '''function bind(el: HTMLElement) {
  let active = false

  const render = () => {
    // classList.toggle with a force flag is one operation and always correct.
    // Assigning className means building the whole string, and forgetting to keep
    // the classes you did not mean to touch.
    el.classList.toggle('is-active', active)
    el.setAttribute('aria-pressed', String(active))
  }

  el.addEventListener('click', () => {
    active = !active
    render()
  })

  render()   // sync the DOM to the initial state, do not assume the markup is right
}
''',
        "ai": (
            "`classList.toggle(name, force)` adds the class when `force` is true and "
            "removes it when false, in a single call — no branch, no string "
            "concatenation, and classes you did not mention are untouched. Assigning "
            "`className` replaces the entire value, so any conditional build has to "
            "re-list every class the element should keep. `aria-pressed` is what lets a "
            "screen reader announce the toggle's state; a visual class alone is invisible "
            "to assistive tech. The final `render()` call matters because the initial "
            "markup and the state can disagree — calling it once on setup means the "
            "component is correct regardless of how it was written in HTML."
        ),
    },
]


# ---------------------------------------------------------------- comments

# (body, author_index, snippet_index, hours_ago)
#
# Every line here is checked against `screen_comment` before it is inserted, for
# the same reason the route checks it: a seed that bypassed the filter would put
# content in the database that the app itself would have refused, which is worse
# than no data at all.
COMMENTS = [
    ("Switched to the lifespan hook last month and the shutdown ordering just works now.", 4, 0, 3),
    ("Does the pool get closed if startup raises before the yield?", 5, 0, 2),
    ("Confirmed — a failed startup never reaches the yield, so nothing to close.", 4, 0, 1),
    ("The comment about full jitter is the part everyone skips and then wonders why their outage repeats.", 0, 1, 26),
    ("Ran the numbers on this. At 200 clients the p99 recovery is roughly 4x better with jitter.", 7, 1, 20),
    ("Worth adding a cap on base_delay. Ours was 0.2 * 2**15 on a stubborn dependency.", 12, 1, 14),
    ("I use this for every search box. The cleanup function being the whole mechanism still surprises people.", 2, 2, 50),
    ("Worth noting this is not cancellation for fetches. You still want an AbortController.", 10, 2, 46),
    ("flat(Infinity) on a cyclic array is a stack overflow I have personally shipped to production.", 3, 3, 72),
    ("Yes. I put that in a comment on our lint rules so nobody tries it again.", 8, 3, 70),
    ("ON CONFLICT DO NOTHING silently returning zero rows cost me an afternoon once.", 11, 4, 96),
    ("The conflict target has to match a unique index exactly — partial indexes trip people up.", 0, 4, 90),
    ("Good catch on the timezone thing. Our reports were off by a day for anyone east of UTC.", 13, 5, 120),
    ("enumerating results on a 40GB log is what finally made this fast for us.", 6, 6, 140),
    ("errors=replace is essential. Our log has bytes from three different runtimes in it.", 9, 6, 132),
    ("-F versus -f is the single most useful thing in this comment.", 14, 7, 160),
    ("Went back and changed our deploy script over this. Thanks.", 2, 7, 150),
    ("The awk layer is nice. I usually just read the raw blocks and misread them as MB.", 5, 8, 175),
    ("Drop is the reason I stopped fighting resource management in Rust.", 12, 9, 200),
    ("The lifetime example makes the borrow error click. That error message confused me for weeks.", 1, 10, 210),
    ("The comment on move semantics is exactly right — it is documentation, not a restriction.", 6, 10, 205),
    ("Bounded channel is doing more work here than the worker pool itself.", 15, 11, 230),
    ("The note about receiving blocking rather than spinning is the thing people miss.", 3, 11, 225),
    ("%w over %v is a genuine bug class avoided. I have seen string matching in production code.", 13, 12, 250),
    ("That error handler arity note should be in the Express docs.", 10, 13, 270),
    ("Bit me exactly once. Cost me an hour of wondering why nothing was logged.", 8, 13, 265),
    ("Trailing call matters more than I expected. Scroll position was landing one event behind.", 11, 14, 290),
    ("auto-fit versus auto-fill is the part everyone gets wrong with a single item.", 4, 15, 310),
    ("Replaced a media query with this. Much better.", 14, 15, 300),
    ("position: fixed with inset: 0 is the only version that has not needed fixing.", 7, 16, 330),
    ("field(default_factory=list) — mutated a shared default once and lost an afternoon.", 9, 17, 350),
    ("slots=True caught a typo in an attribute name immediately.", 2, 17, 345),
    ("sorted(scores) sorting keys instead of values is a trap I have fallen into.", 5, 18, 370),
    ("itemgetter for hot loops, good call.", 12, 18, 365),
    ("Your JSDoc explains it better than the spec does.", 15, 19, 390),
    ("narrowing on the discriminant is the actual feature here.", 1, 19, 385),
    ("git reset --hard is the one that always bites. Now I stash first, every time.", 6, 20, 410),
    ("git revert on a shared branch, always. Learned that the expensive way.", 13, 20, 405),
    ("data-label plus ::before is a neat trick. Keeping the thead for screen readers is the important part.", 3, 21, 430),
    ("flock is the answer to a problem I did not know I had until I read this.", 10, 22, 450),
    ("IFS newline-tab is a good habit. Filenames with spaces are the gift that keeps giving.", 8, 22, 445),
    ("Max-Age on the preflight is such a simple win on a busy API.", 14, 23, 470),
    ("Vary: Origin is the one that bites when you scale to a CDN.", 4, 23, 465),
    ("re.VERBOSE and the \\\\s gotcha is real. Lost an hour to that exact thing.", 11, 24, 490),
    ("groupdict() is nicer than unpacking three group() calls.", 2, 24, 485),
    ("The note about Fernet not being able to sign is important and often missed.", 12, 25, 510),
    ("We use it for exactly this. Storing the key in a secret manager, not the database.", 9, 25, 505),
    ("classList.toggle with the force flag is cleaner than I expected.", 15, 26, 530),
    ("aria-pressed is the part people leave out and then cannot debug.", 7, 26, 525),
]


# ---------------------------------------------------------------- collections

COLLECTIONS = [
    ("Onboarding reading", "What to read before touching anything here.", 0, [0, 1, 6, 17]),
    ("Patterns worth stealing", "Retry, teardown, and the boring reliability work.", 1, [1, 9, 16, 25]),
    ("Frontend reference", "Layout, responsive tables, and DOM handling.", 4, [15, 16, 21, 26]),
    ("Database notes", "Upserts, bucketing, and timezone traps.", 2, [4, 5]),
    ("Tooling", "Shell, git, and things that run in CI.", 12, [7, 8, 20, 22]),
    ("Types and contracts", "Narrowing, unions, and what actually validates.", 14, [19, 24]),
    ("Concurrency", "Threads, channels, and ownership.", 5, [9, 10, 11]),
    ("HTTP in practice", "Preflight, headers, and error semantics.", 7, [12, 23]),
    ("Weekend reading", "Nothing urgent in here.", 10, [2, 18]),
    ("To rewrite properly", "Works, but not the way I would write it today.", 3, [13, 27]),
]


# Earlier revisions of this seed used Gmail plus-addresses off a single mailbox
# (`engg.ns.kiro+N@gmail.com`). Those rows can still be sitting in a database that was
# seeded from one of them, and `--reset` keys on the addresses in `USERS` — which no
# longer match. Listing them here means a reset cleans up after itself instead of
# leaving an orphaned dataset that no query in the app can reach.
LEGACY_DEMO_EMAILS = [f"engg.ns.kiro+{n}@gmail.com" for n in range(1, 21)]


def _reset(db) -> None:
    """Remove the demo rows, and only those.

    Users are matched on the demo email addresses rather than by name, so this can
    never touch an account a person actually signed up with — even one that happens
    to be called "ada".
    """
    demo_emails = [u["email"] for u in USERS] + LEGACY_DEMO_EMAILS
    users = db.query(User).filter(User.email.in_(demo_emails)).all()
    if not users:
        print("nothing to reset")
        return

    ids = [u.id for u in users]
    snippet_ids = [
        s.id for s in db.query(Snippet).filter(Snippet.author_id.in_(ids)).all()
    ]

    # Children first. The FKs are ON DELETE CASCADE, so Postgres would clean this up
    # on its own, but deleting explicitly keeps the intent readable and does not depend
    # on the engine actually honouring the constraint.
    #
    # Both directions are covered for each join table. Rows *pointing at* a demo user
    # have to go because the user is going away; rows pointing *at* a demo snippet
    # have to go too, even when the other end belongs to a real account — a bookmark on
    # a deleted snippet would otherwise be left dangling by an id nothing can resolve.
    db.query(Comment).filter(Comment.user_id.in_(ids)).delete(synchronize_session=False)
    db.query(SnippetBookmark).filter(SnippetBookmark.user_id.in_(ids)).delete(synchronize_session=False)
    db.query(Collection).filter(Collection.user_id.in_(ids)).delete(synchronize_session=False)

    if snippet_ids:
        db.query(Comment).filter(Comment.snippet_id.in_(snippet_ids)).delete(synchronize_session=False)
        db.query(SnippetBookmark).filter(SnippetBookmark.snippet_id.in_(snippet_ids)).delete(synchronize_session=False)
        db.query(CollectionSnippet).filter(CollectionSnippet.snippet_id.in_(snippet_ids)).delete(synchronize_session=False)
        db.query(SnippetTag).filter(SnippetTag.snippet_id.in_(snippet_ids)).delete(synchronize_session=False)
        db.query(Snippet).filter(Snippet.id.in_(snippet_ids)).delete(synchronize_session=False)

    db.query(User).filter(User.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    print(f"reset: removed {len(users)} demo users and everything they owned")


def seed(reset: bool = False, verify: bool = True) -> None:
    """Fill the demo tables.

    `verify` marks every seeded account as having confirmed its email. It defaults to
    True because a demo dataset nobody can sign into is not much of a demo, and an
    unverified account is bounced away from the app by the frontend's own guard. Pass
    `--no-verify` when you specifically want to exercise the "check your inbox" path —
    four of the sixteen accounts are left unverified under that flag, so there is still
    a mix rather than a uniform wall of pending banners.
    """
    Base.metadata.create_all(bind=engine)
    db = session_local()

    try:
        if reset:
            _reset(db)

        # ---------------------------------------------------------- users
        users: list[User] = []
        created = skipped = 0

        for index, spec in enumerate(USERS, start=1):
            email = spec["email"]

            existing = db.query(User).filter(User.email == email).first()
            if existing:
                users.append(existing)
                skipped += 1
                continue

            joined = datetime.now(timezone.utc) - timedelta(days=spec["age_days"])

            # Every seventh account stays pending under `--no-verify`, so the
            # unverified state has a subject without making the whole dataset look
            # broken.
            is_verified = spec["verified"] or (verify or index % 7 != 0)

            user = User(
                name=spec["name"],
                email=email,
                # A verified account has `email_verified_at` stamped; an unverified one
                # keeps it null so the "check your inbox" banner has a subject.
                email_verified=is_verified,
                email_verified_at=joined if is_verified else None,
                # Every demo account shares one password so a reviewer can sign in as
                # any of them. It is hashed once and the hash reused, rather than
                # running the same plaintext through bcrypt sixteen times.
                password_hash=hash_password(DEMO_PASSWORD),
                username=sanitize_username(spec["username"]),
                bio=spec["bio"],
                website=spec["website"],
                profile_image=None,
                created_at=joined,
                updated_at=joined,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            users.append(user)
            created += 1

        print(f"users: {created} created, {skipped} already existed")

        # A handle can collide with an account created outside this script. The
        # unique index would turn that into a 500 at signup, so resolve it the same
        # way `claim_username` does.
        for user in users:
            clash = db.query(User).filter(
                User.username == user.username, User.id != user.id
            ).first()
            if clash:
                base = sanitize_username(user.email.split("@")[0]) or "user"
                suffix = 2
                candidate = f"{base}{suffix}"
                while db.query(User).filter(User.username == candidate).first():
                    suffix += 1
                    candidate = f"{base}{suffix}"
                user.username = candidate
        db.commit()

        # ------------------------------------------------------- snippets
        snippets: list[Snippet] = []
        snippet_count = 0

        for author_index, spec in enumerate(SNIPPETS):
            author = users[author_index % len(users)]

            # Keyed on the title so a second run tops up rather than duplicating a
            # snippet that is already there.
            existing = db.query(Snippet).filter(
                Snippet.author_id == author.id, Snippet.title == spec["title"]
            ).first()
            if existing:
                snippets.append(existing)
                continue

            created_at = datetime.now(timezone.utc) - timedelta(
                days=RNG.randint(1, 300), hours=RNG.randint(0, 23)
            )

            snippet = Snippet(
                title=spec["title"],
                description=spec["description"],
                code=spec["code"],
                language=spec["language"],
                is_public=spec["public"],
                # Private snippets never appear on the community or trending views, so
                # giving them copy counts would inflate nothing but the owner's own
                # dashboard — which is the honest thing for it to show.
                copy_count=RNG.randint(0, 240) if spec["public"] else RNG.randint(0, 12),
                ai_explanation=spec.get("ai"),
                author_id=author.id,
                created_at=created_at,
                updated_at=created_at,
            )
            # Added before the tag loop below. Appending to a relationship on an object
            # the session doesn't know about yet is silently ignored — SQLAlchemy warns
            # and moves on, and the snippet ends up saved with no tags at all.
            db.add(snippet)

            for tag_name in spec["tags"]:
                normalized = tag_name.strip().lower()
                tag = db.query(Tag).filter(Tag.name == normalized).first()
                if not tag:
                    tag = Tag(
                        name=normalized,
                        # Same slug rule the snippet route uses, so a seeded tag and a
                        # tag created through the app are indistinguishable.
                        slug=normalized.replace(" ", "-"),
                    )
                    db.add(tag)
                    db.flush()
                snippet.tags.append(tag)

            db.commit()
            db.refresh(snippet)
            snippets.append(snippet)
            snippet_count += 1

        print(f"snippets: {snippet_count} created, {len(SNIPPETS) - snippet_count} already existed")

        # -------------------------------------------------------- comments
        comment_count = 0
        for body, author_index, snippet_index, hours_ago in COMMENTS:
            if snippet_index >= len(snippets):
                continue

            author = users[author_index % len(users)]
            snippet = snippets[snippet_index]

            refusal = screen_comment(body)
            if refusal:
                print(f"  SKIPPED (moderation): {body[:60]!r} -> {refusal}")
                continue

            # Comments on a private snippet are still private, but a public viewer
            # should never see a thread on something they cannot open — so only
            # public snippets get seeded comments.
            if not snippet.is_public:
                continue

            existing = db.query(Comment).filter(
                Comment.user_id == author.id,
                Comment.snippet_id == snippet.id,
                Comment.body == body,
            ).first()
            if existing:
                continue

            posted = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
            db.add(
                Comment(
                    user_id=author.id,
                    snippet_id=snippet.id,
                    body=body,
                    created_at=posted,
                )
            )
            comment_count += 1

        db.commit()
        print(f"comments: {comment_count} created")

        # ----------------------------------------------------- bookmarks
        # Everyone bookmarks a few other people's public snippets, which is what
        # makes the dashboard's "Saved" view non-empty for each account.
        bookmark_count = 0
        public_snippets = [s for s in snippets if s.is_public]

        for user in users:
            already = {
                row.snippet_id
                for row in db.query(SnippetBookmark).filter(
                    SnippetBookmark.user_id == user.id
                ).all()
            }
            candidates = [s for s in public_snippets if s.author_id != user.id]
            RNG.shuffle(candidates)

            # The count is keyed on the user, not on the draw, and the pool is filtered
            # to what they have *not* already saved. Shuffling first and then taking a
            # fixed slice would not be idempotent: every run reshuffles, so a re-run
            # picks a different slice and the count creeps upward toward the size of
            # the pool until the dashboard is nothing but bookmarks.
            want = RNG.randint(2, 5) - len(already)
            for snippet in candidates[: max(0, want)]:
                if snippet.id in already:
                    continue
                db.add(SnippetBookmark(user_id=user.id, snippet_id=snippet.id))
                bookmark_count += 1

        db.commit()
        print(f"bookmarks: {bookmark_count} created")

        # ---------------------------------------------------- collections
        collection_count = 0
        for name, description, owner_index, snippet_indices in COLLECTIONS:
            owner = users[owner_index % len(users)]

            existing = db.query(Collection).filter(
                Collection.user_id == owner.id, Collection.name == name
            ).first()
            if existing:
                continue

            made = datetime.now(timezone.utc) - timedelta(days=RNG.randint(5, 200))

            collection = Collection(
                name=name,
                description=description,
                user_id=owner.id,
                created_at=made,
                updated_at=made,
            )
            db.add(collection)
            db.flush()

            for snippet_index in snippet_indices:
                if snippet_index >= len(snippets):
                    continue
                snippet = snippets[snippet_index]
                # A collection is private to its owner, so putting someone else's
                # snippet in it would either leak the collection or the snippet.
                if snippet.author_id != owner.id:
                    continue

                dupe = db.query(CollectionSnippet).filter(
                    CollectionSnippet.collection_id == collection.id,
                    CollectionSnippet.snippet_id == snippet.id,
                ).first()
                if dupe:
                    continue
                db.add(
                    CollectionSnippet(
                        collection_id=collection.id, snippet_id=snippet.id
                    )
                )

            db.commit()
            collection_count += 1

        print(f"collections: {collection_count} created")

        # --------------------------------------------------------- oauth
        # Not created here. An `OAuthAccount` row means "this person completed a
        # Google or GitHub consent screen", which is a claim about a real account at
        # a real provider. Inventing one would produce a profile that can never sign
        # in and cannot be distinguished from a real link by any future code.

        # --------------------------------------------------------- token
        total_users = db.query(User).count()
        total_snippets = db.query(Snippet).count()
        total_comments = db.query(Comment).count()
        total_tags = db.query(Tag).count()
        total_collections = db.query(Collection).count()
        total_bookmarks = db.query(SnippetBookmark).count()
        public_count = db.query(Snippet).filter(Snippet.is_public.is_(True)).count()

        print()
        print("=" * 58)
        print(f"  users       {total_users}")
        print(f"  snippets    {total_snippets}  ({public_count} public, {total_snippets - public_count} private)")
        print(f"  comments    {total_comments}")
        print(f"  tags        {total_tags}")
        print(f"  collections {total_collections}")
        print(f"  bookmarks   {total_bookmarks}")
        print("=" * 58)
        print()
        print(f"  every demo account signs in with: {DEMO_PASSWORD}")
        print("  sign in as any of:")
        for spec in USERS[:3]:
            print(f"    {spec['email']}")
        print(f"    … and {len(USERS) - 3} more")

        pending = (
            db.query(User).filter(
                User.email.like("%@example.%"),
                User.email_verified.is_(False),
            ).count()
        )
        if pending:
            print()
            print(f"  {pending} account(s) are deliberately unverified — they exist so the")
            print("  'check your inbox' banner has something to show. Re-run with")
            print("  --reset --verify to make the whole dataset verified.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed SnippetVault with demo data",
        epilog=(
            "To seed the deployed database rather than your local one, export the "
            "connection string first so there is no chance of picking up the wrong "
            "one from .env:\n"
            "  DATABASE_URL='postgresql://…' python -m scripts.seed_demo_data"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="delete the demo rows first (matches on the demo emails, never on names)",
    )
    parser.add_argument(
        "--no-verify",
        dest="verify",
        action="store_false",
        help=(
            "leave a few accounts unverified so the email-confirmation banner can be "
            "tested; by default every demo account is marked verified"
        ),
    )
    args = parser.parse_args()

    try:
        seed(reset=args.reset, verify=args.verify)
    except KeyboardInterrupt:
        sys.exit(130)
