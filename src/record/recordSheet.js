import { computed, ref, toValue, watch } from 'vue'
import { useDataPackage } from '../composables/useDataPackage.js'
import { entityRef } from '../composables/useEntities.js'
import { useRecordLanguage } from '../composables/useRecordLanguage.js'
import { renderBlock, renderInline, renderPlain } from '../i18n/markdown.js'

const BASE_LANGUAGE = 'en'

// A record page does the same things on every website before it shows a
// single field: decide which language the record is read in, load that
// language for the record's entity and for the entities its sheet names
// (dynasties, glossary, partners), gather the glossary terms the record
// reaches in that language for the renderer, and say when it is ready.
// Seven pages wrote that choreography by hand. This is the one place it is
// written, on top of `useRecordLanguage`, which decides the language.

/**
 * `{ id, word, definition, spellings }` for each glossary term of `record`
 * (its `glossary_ids`), with the spellings and definition in `language`,
 * falling back to English, then to the term's own headword.
 */
export function glossaryTermsFor(record, language, { entity = 'glossary', translations, byId } = {}) {
  const ids = record?.glossary_ids ?? []
  if (ids.length === 0) return []
  const rows = translations(entity, language)
  const fallback = translations(entity, BASE_LANGUAGE)
  const out = []
  for (const id of ids) {
    const term = byId?.get(id)
    const t = rows[id] ?? fallback[id] ?? {}
    const spellings = (t.spellings ?? []).map((s) => String(s).trim()).filter(Boolean)
    const word = term?.word ?? spellings[0] ?? ''
    if (!word && spellings.length === 0) continue
    out.push({ id, word, definition: t.definition ?? '', spellings: spellings.length ? spellings : [word] })
  }
  return out
}

/** The `[{ id, spelling }]` list the renderers highlight, one entry per spelling. */
export function glossaryEntries(terms) {
  const out = []
  for (const term of terms ?? []) {
    for (const spelling of term.spellings) out.push({ id: term.id, spelling, definition: term.definition, word: term.word })
  }
  return out
}

/**
 * The record page's engine.
 *
 * `record` is a ref, computed or getter. `entity` is the record's entity;
 * `translations` names the other entities the sheet reads in the record's
 * language (`['dynasties', 'glossary', 'partners']`). Returns what
 * `useRecordLanguage` returns — `language`, `languages`, `dir`, `select`,
 * `reset` — plus `text` (the record's translation in the active language,
 * falling back to English), `ready` (every named load done for this record
 * and language), `terms` and `glossary` (the record's glossary terms, and
 * the spelling list the renderers take), and `attribution` when asked for.
 *
 * `attribution: ['author', 'copy_editor']` names fields that are proper
 * names rather than text: when the active language's row lacks them, the
 * first other language of the record that has them supplies them. This is
 * the one place a page reads across languages, and it exists because the
 * importer files some records' credits on one language only.
 */
export function useRecordSheet(record, { entity, translations: related = [], attribution: attributionFields = [], languages } = {}) {
  if (!entity) throw new Error('useRecordSheet: entity is required')
  const pkg = useDataPackage()
  const language = useRecordLanguage(record, { entity, languages })
  const ready = ref(false)
  const attribution = ref({})
  const glossaryRecords = related.includes('glossary') ? entityRef('glossary') : null

  const text = computed(() => {
    const current = toValue(record)
    return current ? pkg.tr(entity, current.id, language.language.value, BASE_LANGUAGE) : {}
  })

  async function resolveAttribution(current, lang) {
    const own = pkg.tr(entity, current.id, lang, BASE_LANGUAGE)
    if (attributionFields.some((field) => own[field])) return {}
    for (const code of language.languages.value) {
      if (code === lang) continue
      await pkg.loadTranslations(entity, code)
      const row = pkg.translations(entity, code)[current.id] ?? {}
      if (attributionFields.some((field) => row[field])) {
        const found = { from: code }
        for (const field of attributionFields) if (row[field]) found[field] = row[field]
        return found
      }
    }
    return {}
  }

  let generation = 0
  async function load() {
    const current = toValue(record)
    const lang = language.language.value
    const mine = ++generation
    ready.value = false
    attribution.value = {}
    if (!current) {
      ready.value = true
      return
    }
    // The record language and English both: `tr` falls back to English for a
    // record or a term that has no row in the active language, and a fallback
    // that has not been loaded is a blank, not a fallback.
    const languages = lang === BASE_LANGUAGE ? [lang] : [lang, BASE_LANGUAGE]
    await Promise.all(
      [entity, ...related].flatMap((name) => languages.map((code) => pkg.loadTranslations(name, code))),
    )
    if (mine !== generation) return
    if (attributionFields.length) {
      const found = await resolveAttribution(current, lang)
      if (mine !== generation) return
      attribution.value = found
    }
    ready.value = true
  }

  watch(() => [toValue(record)?.id, language.language.value], load, { immediate: true })

  const glossaryIndex = computed(() =>
    glossaryRecords ? new Map((glossaryRecords.value ?? []).map((term) => [term.id, term])) : new Map(),
  )
  const terms = computed(() =>
    glossaryTermsFor(toValue(record), language.language.value, {
      translations: pkg.translations,
      byId: glossaryIndex.value,
    }),
  )
  const glossary = computed(() => glossaryEntries(terms.value))

  return { ...language, text, ready, terms, glossary, attribution }
}

// ── The field engine ───────────────────────────────────────────────────────
//
// A sheet is a list of labelled values, in an order, with the empty ones
// dropped. Which fields, in what order, under which labels, is the site's:
// "Materials/techniques" on Islamic Art and "Type" on a gallery name the
// same field and are both legacy facts. The spec is data; this turns it into
// rows and renders every value through the one pipeline, with the glossary.

const RENDER = {
  inline: (value, ctx) => renderInline(value, { glossary: ctx.glossary }),
  block: (value, ctx) => renderBlock(value, { breaks: true, glossary: ctx.glossary }),
  plain: (value) => renderPlain(value),
  link: (value) => String(value),
  custom: (value) => value,
}

function present(value) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * `[{ key, label, render, value, html }]` from a spec and a context.
 *
 * A spec entry is `{ key, label, value, render = 'inline', when }`: `label`
 * a text (already looked up) or `(ctx) => text`; `value` a function of the
 * context returning the raw value, or the name of a field of `ctx.text`;
 * `render` one of `inline`, `block`, `plain` (rendered through the pipeline
 * with `ctx.glossary`), `link` (the value is an address) or `custom` (the
 * value is handed back as it is, for a slot); `when(ctx)` gates the row.
 * Rows whose value is empty are dropped. `ctx` is whatever the site passes —
 * typically `{ record, text, glossary, ...helpers }`.
 */
export function sheetRows(spec, ctx = {}) {
  const rows = []
  for (const entry of spec ?? []) {
    if (!entry || (entry.when && !entry.when(ctx))) continue
    const raw = typeof entry.value === 'function' ? entry.value(ctx) : ctx.text?.[entry.value ?? entry.key]
    if (!present(raw)) continue
    const render = entry.render ?? 'inline'
    const renderer = RENDER[render]
    if (!renderer) throw new Error(`sheetRows: unknown render "${render}" on "${entry.key}"`)
    const value = Array.isArray(raw) && render !== 'custom' ? raw.join(entry.join ?? ', ') : raw
    rows.push({
      key: entry.key,
      label: typeof entry.label === 'function' ? entry.label(ctx) : (entry.label ?? entry.key),
      render,
      value,
      html: render === 'custom' || render === 'link' ? null : renderer(value, ctx),
    })
  }
  return rows
}
