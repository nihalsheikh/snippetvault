import type { Language } from './types'

/**
 * A deliberately small tokenizer that mirrors the design's syntax palette
 * (`.kw .fn .str .cm .tp .num .prop`). Monaco handles the real editor; this
 * exists for the small, static previews on cards and the auth panel.
 */

const KEYWORDS: Record<string, string[]> = {
  typescript: 'const let var function return async await import from export default new class extends interface type enum implements public private readonly static if else for while do switch case break continue try catch finally throw typeof instanceof in of as satisfies keyof infer never void null undefined true false this super yield delete void abstract declare namespace readonly override satisfies'.split(' '),
  javascript: 'const let var function return async await import from export default new class extends if else for while do switch case break continue try catch finally throw typeof instanceof in of delete this super yield null undefined true false'.split(' '),
  python: 'def class return if elif else for while break continue try except finally raise import from as with lambda pass yield global nonlocal assert async await None True False self in is not and or print len range str int dict list tuple set'.split(' '),
  rust: 'fn let mut const struct enum impl trait pub use mod match if else for while loop return async await move ref self Self where as dyn crate super unsafe where box in crate type static unsafe trait'.split(' '),
  go: 'func package import return var const type struct interface map chan go defer if else for range switch case break continue select nil true false string int error make new len panic recover'.split(' '),
  sql: 'select from where insert into values update set delete create table alter drop index join left right inner outer on group by order having limit offset union all distinct as with recursive is null not and or primary key foreign references default case when then else end exists between like ilike returning'.split(' '),
  bash: 'if then else elif fi for while do done case esac function return local export echo cd cp mv rm mkdir source exit set unset trap'.split(' '),
  json: 'true false null'.split(' '),
  yaml: 'true false null yes no'.split(' '),
  css: 'important media supports keyframes import from to'.split(' '),
  html: 'div script style'.split(' '),
  java: 'public private protected class interface extends implements return new static final void int String try catch throw throws import package null true false this super'.split(' '),
  c: 'int char void float double long short unsigned struct union enum typedef static const return if else for while do switch case break continue goto sizeof include define'.split(' '),
  cpp: 'int char void float double long short unsigned struct class public private protected template typename using namespace return new delete if else for while do switch case break continue include define constexpr auto nullptr'.split(' '),
  ruby: 'def class module end return if elsif else unless while until for in do begin rescue ensure raise nil true false self require attr_accessor yield then next break'.split(' '),
  php: 'function class public private protected static return new if else foreach as while do try catch throw null true false echo namespace use extends implements interface abstract const require include'.split(' '),
  swift: 'func let var class struct enum protocol extension return if else guard for while switch case break continue nil true false import throw throws try catch async await self init some any as in'.split(' '),
  kotlin: 'fun val var class object interface return if else for while when break continue null true false import package suspend private public internal override data sealed is as in by'.split(' '),
  other: [],
}

const KEYWORD_SET = new Map<Language, Set<string>>(
  Object.entries(KEYWORDS).map(([lang, words]) => [lang as Language, new Set(words)]),
)

const IDENT_RE = /[A-Za-z_$][A-Za-z0-9_$]*/
const NUMBER_RE = /\b\d+(\.\d+)?\b/
const STRING_RE = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/

export interface Token {
  text: string
  cls: 'kw' | 'fn' | 'str' | 'cm' | 'tp' | 'num' | 'prop' | null
}

/**
 * Splits one line of source into styled tokens. Line comments are handled by
 * the caller via {@link splitComment}, so this stays a pure per-line pass.
 */
export function tokenizeLine(line: string, lang: Language): Token[] {
  const keywords = KEYWORD_SET.get(lang) ?? new Set<string>()
  const tokens: Token[] = []
  let i = 0

  const push = (text: string, cls: Token['cls']) => {
    if (!text) return
    const last = tokens[tokens.length - 1]
    if (last && last.cls === cls) last.text += text
    else tokens.push({ text, cls })
  }

  while (i < line.length) {
    const rest = line.slice(i)

    const str = rest.match(STRING_RE)
    if (str && str.index === 0) {
      push(str[0], 'str')
      i += str[0].length
      continue
    }

    const ident = rest.match(IDENT_RE)
    if (ident && ident.index === 0) {
      const word = ident[0]
      // Skip the function-name position when the previous word was `def`/`func`/etc.
      const prevWord = tokens.length
        ? (tokens[tokens.length - 1].text.match(/([A-Za-z_$]+)$/)?.[1] ?? '')
        : ''
      const isDef = /^(def|func|fn|function|class|struct|interface|impl|enum|trait|type|module|mod)$/.test(prevWord)

      if (keywords.has(word)) push(word, 'kw')
      else if (isDef) push(word, 'fn')
      else if (i > 0 && line[i - 1] === '.') push(word, 'prop')
      else if (line[i + word.length] === '(') push(word, 'fn')
      else push(word, null)

      i += word.length
      continue
    }

    const num = rest.match(NUMBER_RE)
    if (num && num.index === 0) {
      push(num[0], 'num')
      i += num[0].length
      continue
    }

    push(line[i], null)
    i += 1
  }

  return tokens
}

/** Splits a line into `[code, comment]` at the first unquoted `//`, `#` or `--`. */
export function splitComment(line: string, lang: Language): [string, string | null] {
  const markers = lang === 'sql' || lang === 'bash' || lang === 'python' ? ['#'] : ['//']
  let inStr: '"' | "'" | '`' | null = null

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inStr) {
      if (ch === '\\') i++
      else if (ch === inStr) inStr = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch
      continue
    }
    for (const marker of markers) {
      if (line.startsWith(marker, i)) return [line.slice(0, i), line.slice(i)]
    }
  }
  return [line, null]
}

/**
 * Returns one array of React-ready tokens per source line.
 *
 * Given a single line of code, the result is a one-element array: use `[0]`.
 */
export function highlight(code: string, lang: Language): Token[][] {
  return code.split('\n').map((line) => {
    const [before, comment] = splitComment(line, lang)
    const tokens = tokenizeLine(before, lang)
    if (comment) tokens.push({ text: comment, cls: 'cm' })
    return tokens
  })
}

export const TOKEN_COLOR: Record<NonNullable<Token['cls']>, string> = {
  kw: 'var(--kw)',
  fn: 'var(--fn)',
  str: 'var(--str)',
  cm: 'var(--cm)',
  tp: 'var(--tp)',
  num: 'var(--num)',
  prop: 'var(--prop)',
}