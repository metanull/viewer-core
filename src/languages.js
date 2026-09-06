import { useDataPackage } from './composables/useDataPackage.js'

// Which languages a website offers, decided by one rule for every website: the
// languages the package declares for the site, in the package's order, kept
// only where the site's items actually have content.

export function declaredSiteLanguages(manifest) {
  const declared = manifest?.site?.languages
  if (!Array.isArray(declared)) return null
  return declared.map((entry) => (typeof entry === 'string' ? entry : entry?.code)).filter(Boolean)
}

/**
 * `declared ∩ availableLanguages(entity)`, in the declared order. `declared`
 * defaults to `manifest.site.languages`; a package that carries no such list
 * offers every language its items have content in, alphabetically.
 *
 * A website may pass its own `declared` list to narrow what the package
 * declares — a language that covers a handful of item sheets is worse than no
 * switcher — but never to widen it: a code the package does not declare for
 * this site is dropped even where some items carry it. That keeps the
 * decision of which languages a site *can* offer in the package, and only the
 * decision of which of those it *does* offer in the site.
 */
export function offeredLanguages({ declared, entity = 'items', manifest, availableLanguages } = {}) {
  const pkg = useDataPackage()
  const withContent = (availableLanguages ?? pkg.availableLanguages)(entity)
  const fromPackage = declaredSiteLanguages(manifest ?? pkg.manifest)
  if (!declared && !fromPackage) return [...withContent].sort()
  const list = declared
    ? fromPackage
      ? declared.filter((code) => fromPackage.includes(code))
      : declared
    : fromPackage
  return list.filter((code) => withContent.includes(code))
}

/**
 * `[{ code, label }]` for the language switcher: the native label the package
 * declares for each code, the code itself in capitals where it declares none.
 */
export function languageLabels(codes, manifest) {
  const declared = (manifest ?? useDataPackage().manifest)?.site?.languages
  const labels = new Map()
  for (const entry of Array.isArray(declared) ? declared : []) {
    if (entry && typeof entry === 'object' && entry.code) labels.set(entry.code, entry.label)
  }
  return codes.map((code) => ({ code, label: labels.get(code) || code.toUpperCase() }))
}
