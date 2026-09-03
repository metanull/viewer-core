import { Marked } from 'marked'

// One Markdown pipeline for every text on every website, configured here and
// nowhere else. Its own instance rather than the shared `marked` singleton, so
// configuring it cannot change how a website renders anything else.
//
// Raw HTML is escaped rather than rendered. Texts are written by translators
// through the GitHub web interface, and the rules they are given say Markdown
// only; escaping is what makes that a guarantee instead of a request.
//
// This is the only place that guarantee lives. viewer-i18n's checker used to
// reject HTML too, which added nothing here and was wrong about autolinks and
// code spans; it no longer looks. Anything relaxed in this file is relaxed
// everywhere, with nothing behind it.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (character) => ESCAPES[character])
}

// Raw HTML is escaped in both, because both render text that came from
// somewhere else: a translator's file, or a museum record carried in from the
// legacy system. Neither is a place markup may be authored.
const escaping = {
  renderer: {
    html(token) {
      return escapeHtml(token?.raw ?? token?.text ?? token ?? '')
    },
  },
}

// `breaks` is the one difference, and it is a difference in the source rather
// than in policy. A text in the dictionary is written as prose and wraps freely,
// so a single newline means nothing. A record's field arrives from a database
// where a newline was typed to be a line break, and dropping it runs the lines
// together.
const prose = new Marked({ async: false, gfm: true, breaks: false })
const record = new Marked({ async: false, gfm: true, breaks: true })
prose.use(escaping)
record.use(escaping)

const pipeline = (breaks) => (breaks ? record : prose)

const REGEXP_SPECIAL = /[.*+?^${}()|[\]\\]/g
function escapeRegExp(text) {
  return text.replace(REGEXP_SPECIAL, '\\$&')
}

// A word boundary that also works for a spelling starting or ending in an
// accented letter — JS's own `\b` is `\w`-based (`[A-Za-z0-9_]`), so it does
// not see "é" as a word character and misses the boundary right before one.
const NOT_WORD = '[\\p{L}\\p{N}_]'

/**
 * A marked inline extension: highlights every occurrence of a glossary
 * spelling as `<span class="gloss-term" data-gid="…">`, as a token the
 * parser produces rather than HTML smuggled through the source text — the
 * escaping above still applies to everything else. One instance per
 * distinct glossary (see the cache below); built once, matched against
 * every text rendered with that glossary.
 */
function glossaryExtension(glossary) {
  const bySpelling = new Map()
  for (const { id, spelling } of glossary) {
    const trimmed = spelling?.trim()
    if (!trimmed) continue
    bySpelling.set(trimmed.toLowerCase(), id)
  }

  // Longest spelling first, so "kufic script" wins over "kufic" when a text
  // contains both.
  const spellings = [...bySpelling.keys()].sort((a, b) => b.length - a.length)
  if (spellings.length === 0) return null

  const alternation = spellings.map(escapeRegExp).join('|')
  const findAnywhere = new RegExp(`(?<!${NOT_WORD})(?:${alternation})(?!${NOT_WORD})`, 'iu')
  const matchAtStart = new RegExp(`^(?:${alternation})(?!${NOT_WORD})`, 'iu')

  return {
    name: 'glossaryTerm',
    level: 'inline',
    start(src) {
      return findAnywhere.exec(src)?.index
    },
    tokenizer(src) {
      const match = matchAtStart.exec(src)
      if (!match) return undefined
      return {
        type: 'glossaryTerm',
        raw: match[0],
        text: match[0],
        id: bySpelling.get(match[0].toLowerCase()),
      }
    },
    renderer(token) {
      return `<span class="gloss-term" data-gid="${escapeHtml(token.id)}">${escapeHtml(token.text)}</span>`
    },
  }
}

// Keyed on the spelling list, not on which text is being rendered — every
// field of one record shares the same glossary, and re-parsing that list
// into a regex and a Marked instance for each field would be wasted work.
const glossaryPipelines = new Map()

function glossaryKey(glossary) {
  return JSON.stringify([...glossary].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))
}

function withGlossary(breaks, glossary) {
  const key = glossaryKey(glossary)
  let entry = glossaryPipelines.get(key)
  if (entry === undefined) {
    const extension = glossaryExtension(glossary)
    if (!extension) {
      entry = null // no usable spelling in this list — fall back below
    } else {
      const withProse = new Marked({ async: false, gfm: true, breaks: false })
      const withRecord = new Marked({ async: false, gfm: true, breaks: true })
      withProse.use(escaping, { extensions: [extension] })
      withRecord.use(escaping, { extensions: [extension] })
      entry = { prose: withProse, record: withRecord }
    }
    glossaryPipelines.set(key, entry)
  }
  return entry ? (breaks ? entry.record : entry.prose) : pipeline(breaks)
}

function engineFor(breaks, glossary) {
  return glossary && glossary.length > 0 ? withGlossary(breaks, glossary) : pipeline(breaks)
}

/** A text as one or more paragraphs. `glossary`: `[{ id, spelling }]` to highlight. */
export function renderBlock(text, { breaks = false, glossary } = {}) {
  return engineFor(breaks, glossary).parse(String(text ?? ''))
}

/** A text without the surrounding paragraph, for a heading or a table cell. */
export function renderInline(text, { breaks = false, glossary } = {}) {
  return engineFor(breaks, glossary).parseInline(String(text ?? ''))
}
