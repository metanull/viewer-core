import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// The state of a list page lives in the URL, and the URL is what a visitor
// shares, bookmarks and comes back to through history. Every results page of
// every website therefore does the same four things: read the filters and the
// page out of `route.query`, keep them in step when the route changes under
// it, write them back when the visitor acts, and start again from page one
// when a filter changes. Eleven views wrote those four things by hand before
// this existed, each with its own idiom and its own small differences.
//
// The convention this encodes is rule R8 of the alignment pass: filters and
// the page travel in the query, never in the path; `page` is dropped when it
// is 1; a filter change is a new place in history (`push`), a page change
// replaces the current one (`replace`), and either navigates on the route the
// page is already on, by name, so no view writes a path.

const PAGE = 'page'

function firstValue(value) {
  return Array.isArray(value) ? (value[0] ?? '') : value ?? ''
}

function pageOf(query) {
  const parsed = Number.parseInt(firstValue(query[PAGE]), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

/**
 * Filters and page bound to the route query.
 *
 * `keys` names the filters this page knows. `filters` is a reactive object
 * with one string per key — bind a control to it, then `apply()` to navigate
 * with what it holds (or `apply(patch)` to change some and navigate at once,
 * for a control that navigates on change). `reset()` clears every filter and
 * navigates. `goToPage(n)` changes only the page. `page` is the current page,
 * read from the query. `active` says whether any filter is set.
 *
 * Query parameters the page does not own — `lang`, a parameter of another
 * component — are carried across every navigation untouched.
 */
export function useListQuery({ keys = [], page = true } = {}) {
  const route = useRoute()
  const router = useRouter()

  const filters = reactive(Object.fromEntries(keys.map((key) => [key, ''])))

  function readFromRoute() {
    for (const key of keys) filters[key] = String(firstValue(route.query[key]))
  }
  readFromRoute()
  // The route changing under the page — back, forward, a link to the same
  // page with other filters — is the URL speaking; the controls follow it.
  watch(() => route.query, readFromRoute)

  const current = computed(() => (page ? pageOf(route.query) : 1))
  const active = computed(() => keys.some((key) => filters[key] !== ''))

  function foreignQuery() {
    const out = {}
    for (const [key, value] of Object.entries(route.query)) {
      if (!keys.includes(key) && key !== PAGE) out[key] = value
    }
    return out
  }

  function ownQuery() {
    const out = {}
    for (const key of keys) if (filters[key] !== '') out[key] = filters[key]
    return out
  }

  function location(query) {
    return { name: route.name, params: route.params, query }
  }

  /** Navigate with the filters as they are, or with `patch` applied first. Starts at page 1. */
  function apply(patch = {}) {
    for (const [key, value] of Object.entries(patch)) {
      if (keys.includes(key)) filters[key] = value == null ? '' : String(value)
    }
    return router.push(location({ ...foreignQuery(), ...ownQuery() }))
  }

  /** Clear every filter and navigate. */
  function reset() {
    for (const key of keys) filters[key] = ''
    return router.push(location(foreignQuery()))
  }

  /** Another page of the same results: the same place in history, so back leaves the list. */
  function goToPage(n) {
    const target = Math.max(1, Number.parseInt(n, 10) || 1)
    const query = { ...foreignQuery(), ...ownQuery() }
    if (target > 1) query[PAGE] = String(target)
    return router.replace(location(query))
  }

  return { filters, page: current, active, apply, reset, goToPage }
}
