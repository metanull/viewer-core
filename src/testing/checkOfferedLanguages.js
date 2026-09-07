import { useDataPackage } from '../composables/useDataPackage.js'
import { declaredSiteLanguages, offeredLanguages } from '../languages.js'

// One check of a website's language declaration, shared by every website so
// that the rule is tested once rather than rewritten seven times. It returns
// the problems it finds, as sentences; a website's test asserts the list is
// empty.

/**
 * Checks `config.languages` and `config.navigation.languages` against the
 * data package: only languages with item content are offered; the order is
 * the package's declared order; every offered language has a label, and the
 * switcher lists exactly the offered languages.
 *
 * A website that narrows the package's declaration passes the same `declared`
 * list it gave `offeredLanguages()`, so the check expects the narrowed set —
 * the two helpers apply one rule, and a website that narrows in the config
 * but not in the test would otherwise be told its own list is wrong.
 */
export function checkOfferedLanguages(
  config,
  { declared, entity = 'items', manifest, availableLanguages } = {},
) {
  const pkg = useDataPackage()
  const withContent = (availableLanguages ?? pkg.availableLanguages)(entity)
  const fromPackage = declaredSiteLanguages(manifest ?? pkg.manifest)
  const offered = config?.languages ?? []
  const problems = []

  if (offered.length === 0) {
    problems.push('The website offers no language.')
  }
  for (const code of offered) {
    if (!withContent.includes(code)) {
      problems.push(`"${code}" is offered but no ${entity} carry it.`)
    }
  }
  if (declared || fromPackage) {
    const expected = offeredLanguages({ declared, entity, manifest, availableLanguages })
    if (offered.join(',') !== expected.join(',')) {
      const source = declared ? 'the website narrows the package to' : 'the package declares'
      problems.push(
        `The offered languages are [${offered.join(', ')}] where ${source} [${expected.join(', ')}].`,
      )
    }
  } else {
    const sorted = [...offered].sort()
    if (offered.join(',') !== sorted.join(',')) {
      problems.push('The package declares no site languages, so the offered list has to be alphabetical.')
    }
  }

  const switcher = config?.navigation?.languages
  if (switcher !== undefined) {
    const codes = (switcher ?? []).map((entry) => (typeof entry === 'string' ? entry : entry?.code))
    if (codes.join(',') !== offered.join(',')) {
      problems.push(`The switcher lists [${codes.join(', ')}] where the website offers [${offered.join(', ')}].`)
    }
    for (const entry of switcher ?? []) {
      if (typeof entry === 'object' && !(typeof entry.label === 'string' && entry.label.trim())) {
        problems.push(`"${entry.code}" has no label in the switcher.`)
      }
    }
  }

  return problems
}
