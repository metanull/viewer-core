import { createViewer } from '../createViewer.js'

/**
 * Mount a website to a detached DOM node on a given hash, returning the app,
 * host, and router for test assertions. The router is ready and the app is
 * mounted before the promise resolves.
 *
 * `config` and `messages` are the same objects a website's main.js assembles.
 * `hash` defaults to the home page.
 */
export async function mountSite(config, messages, hash = '#/') {
  window.location.hash = hash
  const app = createViewer({ ...config, messages })
  const host = document.createElement('div')
  document.body.appendChild(host)
  app.mount(host)
  const router = app.config.globalProperties.$router
  await router.isReady()
  return { app, host, router }
}

/**
 * Check that a configuration's routes are properly declared: every route has
 * a name, no route is a catch-all, and every legacy route is listed in
 * `legacyPaths`.
 *
 * Returns the list of problems found (empty if all is well). Routes without
 * names appear by index in the message.
 */
export function checkRoutes(config, { names = [], legacyPaths = [] } = {}) {
  const problems = []
  const declaredNames = (config.extraViews ?? []).map((r) => r.name)
  const declaredLegacy = (config.legacyRoutes ?? []).map((r) => r.path)

  // Check every route has a name.
  for (let i = 0; i < (config.extraViews ?? []).length; i++) {
    if (!config.extraViews[i].name) {
      problems.push(`Route ${i} has no name.`)
    }
  }

  // Check no route is a catch-all.
  if ((config.extraViews ?? []).some((r) => r.path?.includes('pathMatch'))) {
    problems.push('A route is a catch-all (contains pathMatch); the catch-all belongs to the router.')
  }

  // Check expected names are present.
  for (const name of names) {
    if (!declaredNames.includes(name)) {
      problems.push(`Expected route "${name}" not found.`)
    }
  }

  // Check expected legacy paths are present.
  for (const path of legacyPaths) {
    if (!declaredLegacy.includes(path)) {
      problems.push(`Expected legacy path "${path}" not found.`)
    }
  }

  return problems
}

/**
 * Check that every route has a `meta.section` string. A route without one
 * leaves the menu unaware of what section the visitor is in.
 *
 * Returns the list of problems found (empty if all is well).
 */
export function checkSectionMeta(config) {
  const problems = []

  for (const route of config.extraViews ?? []) {
    if (typeof route.meta?.section !== 'string' || !route.meta.section.trim()) {
      problems.push(`Route "${route.name}" has no section metadata.`)
    }
  }

  return problems
}

/**
 * Check that the texts in a mounted host include entries from the given
 * namespaces. Matches each namespace against the rendered text with a
 * case-insensitive regex like `/\b(ns1|ns2)\.[a-z]/i`.
 *
 * Returns the list of text keys matched (empty if none found). A missing
 * key renders as its bare name, e.g. `"catalogue.era.ad"`, which the regex
 * would match.
 */
export function checkTextsRendered(host, { namespaces = [] } = {}) {
  if (!namespaces.length) return []

  const text = host.textContent
  const pattern = new RegExp(`\\b(${namespaces.join('|')})\\.[a-z]`, 'gi')
  const found = new Set()

  for (const match of text.matchAll(pattern)) {
    found.add(match[1])
  }

  return Array.from(found)
}
