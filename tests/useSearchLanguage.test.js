import { describe, expect, it, vi } from 'vitest'
import { useSearchLanguage } from '../src/index.js'
import { useDataPackage } from '../src/index.js'

describe('useSearchLanguage', () => {
  it('returns the sorted list of available languages for the entity', () => {
    const { languages } = useSearchLanguage('things')
    // The languages a composable sees are the ones availableLanguages reports.
    expect(languages.value).toEqual(['en', 'fr'])
  })

  it('initializes the language selection as empty', () => {
    const { language } = useSearchLanguage('things')
    expect(language.value).toBe('')
  })

  it('has a reactive language ref for the selected language', () => {
    const { language } = useSearchLanguage('things')
    language.value = 'fr'
    expect(language.value).toBe('fr')
  })

  it('sorts the available languages', () => {
    // Things has en and fr; places has only en. Both should be sorted
    // (they already are in this fixture, but the composable ensures it).
    const { languages } = useSearchLanguage('things')
    const sorted = [...languages.value]
    expect(sorted).toEqual(sorted.slice().sort())
  })

  it('watches language changes and loads translations', async () => {
    const { language } = useSearchLanguage('things')
    const { translations } = useDataPackage()

    // Start by changing the language
    language.value = 'fr'

    // The watcher should load translations for the new language
    await vi.waitFor(() => {
      expect(Object.keys(translations('things', 'fr')).length).toBeGreaterThan(0)
    })
  })
})
