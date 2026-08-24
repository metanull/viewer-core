import { describe, expect, it } from 'vitest'
import { createViewerI18n } from '../src/i18n/index.js'

describe('createViewerI18n', () => {
  it('uses the first configured language as the active locale', () => {
    const i18n = createViewerI18n({
      languages: ['fr', 'en'],
      messages: { fr: { 'chrome.home': 'Accueil' } },
    })
    expect(i18n.global.locale.value).toBe('fr')
    expect(i18n.global.t('chrome.home')).toBe('Accueil')
  })

  it('falls back to the default English chrome strings', () => {
    const i18n = createViewerI18n({ languages: ['fr', 'en'] })
    expect(i18n.global.t('chrome.backToList')).toBe('Back to the list')
  })

  it('lets website messages override the default chrome strings', () => {
    const i18n = createViewerI18n({
      languages: ['en'],
      messages: { en: { 'chrome.home': 'Start' } },
    })
    expect(i18n.global.t('chrome.home')).toBe('Start')
  })

  it('keeps the current language reactive app-wide', () => {
    const i18n = createViewerI18n({
      languages: ['en', 'fr'],
      messages: { fr: { 'chrome.home': 'Accueil' } },
    })
    expect(i18n.global.t('chrome.home')).toBe('Home')
    i18n.global.locale.value = 'fr'
    expect(i18n.global.t('chrome.home')).toBe('Accueil')
  })
})
