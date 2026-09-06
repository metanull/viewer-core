import { computed, toValue } from 'vue'

// The options a filter offers are the values the records in front of it
// actually carry, labelled, sorted, and nothing else: a country no item is
// from is not offered. Every results page derives that from its records —
// the standalone sites copied the derivation into the entrance and the
// results view of each site, the DXA sites wrote it over tags — and the one
// real difference between them is which records they pass: all of them
// (standalone), or the ones that survive the current filters (DXA, where
// picking a country shrinks the type list). Both are legacy behaviours, and
// both stay the caller's choice: this reads whatever records it is handed.

const compareLabels = (a, b) => a.label.localeCompare(b.label)

function valuesOf(record, spec) {
  if (typeof spec.values === 'function') return [spec.values(record)].flat()
  const raw = record?.[spec.field]
  return Array.isArray(raw) ? raw : [raw]
}

function capitalize(text) {
  const label = String(text ?? '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * `{ [facet]: [{ value, label }] }` from `records`, one entry per facet of
 * `spec`. A facet is `{ field }` (the record property holding the value or
 * the values) or `{ values(record) }`, plus `label(value)` — the site's own
 * label helper, so a country reads as its name — and optionally
 * `include(value)` to keep some values only (a tag of one category),
 * `sort` (`'label'`, the default; a comparator over `{ value, label }`; or
 * `'none'` for the order met), and `capitalize` for the legacy upper-cased
 * first letter of a tag label.
 */
export function facetOptions(records, spec) {
  const out = {}
  for (const [facet, definition] of Object.entries(spec ?? {})) {
    const seen = new Map()
    for (const record of records ?? []) {
      for (const value of valuesOf(record, definition)) {
        if (value == null || value === '' || seen.has(value)) continue
        if (definition.include && !definition.include(value, record)) continue
        let label = definition.label ? definition.label(value, record) : String(value)
        if (definition.capitalize) label = capitalize(label)
        seen.set(value, { value, label: String(label ?? value) })
      }
    }
    const options = [...seen.values()]
    const sort = definition.sort ?? 'label'
    if (sort === 'label') options.sort(compareLabels)
    else if (typeof sort === 'function') options.sort(sort)
    out[facet] = options
  }
  return out
}

/** `facetOptions` over a reactive record source. */
export function useFacets(records, spec) {
  return computed(() => facetOptions(toValue(records), toValue(spec)))
}
