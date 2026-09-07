import { computed, toValue } from 'vue'
import { renderPlain } from '../i18n/markdown.js'
import { useDataPackage } from '../composables/useDataPackage.js'
import { entityRef } from '../composables/useEntities.js'
import { sortChronological } from './pagination.js'

// Two search engines, one interface. The standalone sites search nine named
// fields of the translation record with up to four keyword rows joined by
// AND/OR — `database.php`'s form. The DXA sites run MySQL's boolean
// full-text grammar (`+word -word word* "a phrase"` and the relevance
// operators) over a haystack of the English sheet, which is why their
// "how to search" page is an essay about operators. They are different
// products and each site copied its engine unchanged; here each is written
// once and a site names the one it is.
//
// Both read Markdown fields as plain text, through the pipeline every text
// goes through, so a `*` of emphasis is not searched for and a term written
// in a heading is found.

const plain = (value) => (value == null ? '' : renderPlain(String(value)).toLowerCase())

function strings(value) {
  if (value == null) return []
  if (Array.isArray(value)) return value.flatMap(strings)
  return [String(value)]
}

// ── The field grammar ──────────────────────────────────────────────────────

/**
 * `expand(keyword, lang)` (when given) names alternative spellings of the
 * same keyword — a glossary term's other spellings, a country's other names
 * — searched in the same haystack as the keyword itself, so a row matches on
 * any of them without the site's field map knowing expansion happened.
 */
function fieldMatches(getters, field, keyword, item, text, helpers, expand, lang) {
  const needle = String(keyword ?? '').trim().toLowerCase()
  if (!needle) return true
  const getter = getters[field] ?? getters.keyword ?? Object.values(getters)[0]
  if (!getter) return false
  const hay = strings(getter(item, text, helpers)).map(plain)
  if (hay.some((s) => s.includes(needle))) return true
  if (!expand) return false
  return (expand(String(keyword ?? '').trim(), lang) ?? []).some((alt) => {
    const altNeedle = String(alt ?? '').trim().toLowerCase()
    return altNeedle !== '' && hay.some((s) => s.includes(altNeedle))
  })
}

/**
 * The AND/OR fold of the keyword rows: the first row stands alone, each
 * following row is joined to the result so far by its own `cond`. Rows with
 * no keyword are skipped. No row at all matches everything.
 *
 * `rank: 'hits'` (Decision D3, legacy's `ORDER BY nn DESC, pkdate ASC`)
 * reorders the matches by how many of the active rows each one matched, most
 * first, then chronologically — `sortChronological`'s own rule, undated
 * last, rather than a second date comparator written here. Left unranked
 * (the default) a site keeps its own order, page-size and all — this option
 * exists for a site that wants the legacy order back, not to replace it.
 */
function fieldSearch(getters, items, rows, textOf, helpers, { rank, expand, lang } = {}) {
  const active = (rows ?? []).filter((row) => String(row?.keyword ?? '').trim() !== '')
  if (active.length === 0) return [...items]
  const matched = []
  for (const item of items) {
    const text = textOf(item)
    let result = null
    let hits = 0
    for (const row of active) {
      const hit = fieldMatches(getters, row.field, row.keyword, item, text, helpers, expand, lang)
      if (hit) hits += 1
      if (result === null) result = hit
      else if (String(row.cond).toUpperCase() === 'OR') result = result || hit
      else result = result && hit
    }
    if (result === true) matched.push({ item, hits })
  }
  if (rank === 'hits') {
    const chronological = sortChronological(matched.map((m) => m.item))
    const order = new Map(chronological.map((item, i) => [item, i]))
    matched.sort((a, b) => order.get(a.item) - order.get(b.item))
    matched.sort((a, b) => b.hits - a.hits)
  }
  return matched.map((m) => m.item)
}

// ── The boolean grammar ────────────────────────────────────────────────────

/** `+word -word word* "a phrase" ~word >word <word` → terms. */
export function parseBooleanQuery(input) {
  const terms = []
  const re = /([+\-~<>]?)(?:"([^"]+)"|(\S+))/g
  let match
  while ((match = re.exec(input ?? '')) !== null) {
    const [, op, phrase, word] = match
    let text = (phrase ?? word ?? '').toLowerCase()
    if (!text) continue
    let prefix = false
    if (!phrase && text.endsWith('*')) {
      prefix = true
      text = text.slice(0, -1)
    }
    if (!text) continue
    terms.push({ op: op || '', text, prefix, phrase: Boolean(phrase) })
  }
  return terms
}

const REGEXP_SPECIAL = /[.*+?^${}()|[\]\\]/g

function termMatches(hay, term) {
  if (term.prefix) {
    return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${term.text.replace(REGEXP_SPECIAL, '\\$&')}`, 'u').test(hay)
  }
  return hay.includes(term.text)
}

/** Rank `items` against a boolean query; `hayOf(item)` is the lower-cased haystack. */
function booleanSearch(items, input, hayOf, labelOf) {
  const terms = parseBooleanQuery(input)
  if (terms.length === 0) return []
  const required = terms.filter((t) => t.op === '+')
  const excluded = terms.filter((t) => t.op === '-')
  const optional = terms.filter((t) => t.op !== '+' && t.op !== '-')

  const scored = []
  for (const item of items) {
    const hay = hayOf(item)
    if (!required.every((t) => termMatches(hay, t))) continue
    if (excluded.some((t) => termMatches(hay, t))) continue
    let score = required.length * 2
    let anyOptional = false
    for (const t of optional) {
      if (!termMatches(hay, t)) continue
      anyOptional = true
      // `~` counts against, `>` for more, `<` for less — legacy's relevance
      // operators, as simple weights.
      score += t.op === '~' ? -1 : t.op === '>' ? 2 : t.op === '<' ? 0.5 : 1
    }
    if (!required.length && !anyOptional) continue
    scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score || labelOf(a.item).localeCompare(labelOf(b.item)))
  return scored.map((s) => s.item)
}

// ── The composable ─────────────────────────────────────────────────────────

/**
 * A keyword search over one entity, in one of two grammars.
 *
 * `grammar: 'fields'` — `fields` maps a field name to `(record, text) =>
 * string | string[]`, the strings that field searches (`text` is the
 * record's translation in `language`); `search(rows)` takes
 * `[{ field, keyword, cond }]` and folds them with AND/OR. Which fields exist
 * and what each reads is the site's: the nine of `database.php` are Islamic
 * Art's, Baroque Art's differ. `rank: 'hits'` and `expand` (below) apply to
 * this grammar only — the DXA boolean grammar already ranks by score and is
 * unaffected by either.
 *
 * `grammar: 'boolean'` — `haystack(record, text)` returns the strings the
 * record is searched in; `search(query)` ranks by the boolean grammar.
 *
 * `language` (a ref, getter or string) is the translation language the text
 * is read in — English on every DXA site, the visitor's search language on a
 * standalone one. The haystacks are computed once per record and language
 * and dropped when that language's translations load or change, which is
 * what a site used to do by hand with a `resetSearchIndex()` after
 * `loadEnglish()`.
 *
 * `rank: 'hits'` — off by default, so an existing site's own order (or lack
 * of one) is untouched. On, `search()` returns matches ordered by how many
 * of the query's rows they matched, then chronologically — legacy's
 * `ORDER BY nn DESC, pkdate ASC`. A results page composing this into
 * `viewer-layout`'s list view passes `sort: false` there so the order this
 * function already computed is not sorted a second time.
 *
 * `expand(keyword, language) => string[]` — alternative spellings of a
 * keyword, searched alongside it in whichever field the row names. Off by
 * default. `glossaryExpansion` and `countryExpansion` below are the two
 * legacy rules (`database_results.php:41,113-136,181-186`); `combineExpansions`
 * runs both.
 */
export function useKeywordIndex(entity, { grammar, fields = {}, haystack, language = 'en', label, rank, expand } = {}) {
  if (grammar !== 'fields' && grammar !== 'boolean') {
    throw new Error(`useKeywordIndex: grammar must be "fields" or "boolean", got "${grammar}"`)
  }
  const { tr, translations } = useDataPackage()
  const records = entityRef(entity)
  const labelOf = label ?? ((record) => plain(record?.name ?? record?.title ?? record?.internal_name ?? record?.id))

  const lang = computed(() => toValue(language) || 'en')
  const textOf = (record) => tr(entity, record.id, lang.value, 'en')

  // Keyed on the translation map itself: `translations()` hands out one
  // object per loaded file, so a new object means the file arrived and every
  // haystack built without it is stale.
  let cacheFor = null
  let cache = new Map()
  function hayOf(record) {
    const current = translations(entity, lang.value)
    if (current !== cacheFor) {
      cacheFor = current
      cache = new Map()
    }
    let hay = cache.get(record.id)
    if (hay === undefined) {
      hay = strings(haystack ? haystack(record, textOf(record)) : Object.values(textOf(record)))
        .map(plain)
        .join(' \n ')
      cache.set(record.id, hay)
    }
    return hay
  }

  function search(input) {
    const items = records.value ?? []
    if (grammar === 'fields') {
      return fieldSearch(fields, items, input, textOf, { tr, translations }, { rank, expand, lang: lang.value })
    }
    return booleanSearch(items, input, hayOf, labelOf)
  }

  function reset() {
    cacheFor = null
    cache = new Map()
  }

  return { search, reset, records, language: lang }
}

// ── Expansion hooks ─────────────────────────────────────────────────────────
//
// Both read a term-lookup entity the same way `searchGlossary` does: the
// translation in `language` falling back to English, never the base record
// alone, because a spelling or a name is what the visitor typed in and the
// base record carries neither.

/**
 * A term equal to one of a glossary entry's spellings, in `language`
 * (falling back to English), expands to every spelling of that same entry
 * in that language — legacy's `gl_spellings`/`glossary` lookup
 * (`database_results.php:104-131`): typing the term used in one spelling
 * finds the record written with another.
 */
export function glossaryExpansion({ entity = 'glossary' } = {}) {
  return (term, language) => {
    const needle = String(term ?? '').trim().toLowerCase()
    if (!needle) return []
    const { tr } = useDataPackage()
    for (const record of entityRef(entity).value ?? []) {
      const t = tr(entity, record.id, language)
      const spellings = t.spellings?.length ? t.spellings : [record.word]
      if (spellings.some((s) => String(s ?? '').trim().toLowerCase() === needle)) {
        return spellings.map((s) => String(s).trim())
      }
    }
    return []
  }
}

/**
 * A term equal to a country's name, in `language` (falling back to
 * `internal_name`), expands to that country's id — legacy's
 * `getKeywordCountry` (`database_results.php:27-51,223-224,291-293`): typing
 * "Egypt" also finds the records held in Egypt. Applies to whichever field a
 * row names; the field's own getter decides whether a record's country is
 * part of what it searches — the `keyword` and `location` fields on the
 * standalone form did, in legacy.
 */
export function countryExpansion({ entity = 'countries' } = {}) {
  return (term, language) => {
    const needle = String(term ?? '').trim().toLowerCase()
    if (!needle) return []
    const { tr } = useDataPackage()
    const out = []
    for (const record of entityRef(entity).value ?? []) {
      const name = tr(entity, record.id, language).name ?? record.internal_name ?? record.id
      if (String(name).trim().toLowerCase() === needle) out.push(record.id)
    }
    return out
  }
}

/** Runs every expansion given and concatenates what each returns. */
export function combineExpansions(...expansions) {
  return (term, language) => expansions.flatMap((expand) => expand(term, language) ?? [])
}
