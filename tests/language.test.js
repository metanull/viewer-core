import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyDocumentLanguage,
  isRtl,
  negotiateLanguage,
  readStoredLanguage,
  storeLanguage,
} from '../src/i18n/language.js'

describe('negotiateLanguage', () => {
  const offered = ['en', 'fr', 'ar']

  it('prefers what the URL asks for', () => {
    expect(negotiateLanguage(offered, { requested: 'fr', stored: 'ar' })).toBe('fr')
  })

  it('then the visitor’s remembered choice', () => {
    expect(negotiateLanguage(offered, { stored: 'ar', preferred: ['fr'] })).toBe('ar')
  })

  it('then what the browser asks for, in its own order', () => {
    expect(negotiateLanguage(offered, { preferred: ['de', 'ar', 'fr'] })).toBe('ar')
  })

  it('matches a regional code against the language offered', () => {
    expect(negotiateLanguage(offered, { preferred: ['fr-CA'] })).toBe('fr')
  })

  it('falls back to English', () => {
    expect(negotiateLanguage(offered, { preferred: ['de'] })).toBe('en')
  })

  it('never selects a language the website does not offer', () => {
    expect(negotiateLanguage(['fr', 'ar'], { requested: 'de', stored: 'it' })).toBe('fr')
  })

  it('survives a website that declares nothing', () => {
    expect(negotiateLanguage([])).toBe('en')
  })
})

describe('text direction', () => {
  it('knows the right-to-left languages, region included', () => {
    expect(isRtl('ar')).toBe(true)
    expect(isRtl('ar-EG')).toBe(true)
    expect(isRtl('fr')).toBe(false)
  })

  it('sets lang and dir on the document', () => {
    applyDocumentLanguage('ar')
    expect(document.documentElement.getAttribute('lang')).toBe('ar')
    expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    applyDocumentLanguage('en')
    expect(document.documentElement.getAttribute('dir')).toBe('ltr')
  })
})

describe('the remembered choice', () => {
  beforeEach(() => localStorage.clear())

  it('survives a round trip', () => {
    storeLanguage('fr')
    expect(readStoredLanguage()).toBe('fr')
  })

  it('reads as nothing when storage is unavailable', () => {
    const storage = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    expect(readStoredLanguage()).toBe(null)
    expect(() => storeLanguage('fr')).not.toThrow()
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  })
})
