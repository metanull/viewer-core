import { describe, expect, it } from 'vitest'
import { languageLabels, offeredLanguages } from '../src/index.js'
import { checkOfferedLanguages } from '../src/testing/index.js'

// The fixture package declares fr, en, de for the site, and its things carry
// en and fr — so the website offers fr then en, in that order.

describe('offeredLanguages', () => {
  it('keeps the declared order, and only what the items have content in', () => {
    expect(offeredLanguages({ entity: 'things' })).toEqual(['fr', 'en'])
  })

  it('takes an explicit declaration over the manifest', () => {
    expect(offeredLanguages({ entity: 'things', declared: ['en', 'ar'] })).toEqual(['en'])
  })

  it('offers every language with content, alphabetically, when nothing is declared', () => {
    expect(offeredLanguages({ entity: 'things', manifest: { languages: ['en', 'fr'] } })).toEqual(['en', 'fr'])
  })
})

describe('languageLabels', () => {
  it('labels each code with the name the package declares', () => {
    expect(languageLabels(['fr', 'en'])).toEqual([
      { code: 'fr', label: 'Français' },
      { code: 'en', label: 'English' },
    ])
  })

  it('falls back to the code in capitals', () => {
    expect(languageLabels(['ar'], { site: { languages: [] } })).toEqual([{ code: 'ar', label: 'AR' }])
  })
})

describe('checkOfferedLanguages', () => {
  const good = {
    languages: ['fr', 'en'],
    navigation: { languages: languageLabels(['fr', 'en']) },
  }

  it('passes a declaration derived by the two helpers', () => {
    expect(checkOfferedLanguages(good, { entity: 'things' })).toEqual([])
  })

  it('reports a language without content', () => {
    const problems = checkOfferedLanguages({ ...good, languages: ['fr', 'en', 'de'] }, { entity: 'things' })
    expect(problems.some((p) => p.includes('"de" is offered'))).toBe(true)
  })

  it('reports an order that is not the declared one', () => {
    const problems = checkOfferedLanguages({ ...good, languages: ['en', 'fr'] }, { entity: 'things' })
    expect(problems.some((p) => p.includes('declares [fr, en]'))).toBe(true)
  })

  it('reports a switcher that disagrees with the offer, and a missing label', () => {
    const problems = checkOfferedLanguages(
      { languages: ['fr', 'en'], navigation: { languages: [{ code: 'fr', label: '' }] } },
      { entity: 'things' },
    )
    expect(problems.some((p) => p.includes('The switcher lists [fr]'))).toBe(true)
    expect(problems.some((p) => p.includes('"fr" has no label'))).toBe(true)
  })

  it('reports an empty offer', () => {
    expect(checkOfferedLanguages({ languages: [] }, { entity: 'things' })).toContain('The website offers no language.')
  })
})
