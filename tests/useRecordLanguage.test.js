import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createI18n, resolveRecordLanguage, useRecordLanguage } from '../src/index.js'
import { messages } from './fixtures/messages.js'

// The composable reads the site language from the installed texts, so it is
// exercised inside a component the way a sheet would use it.
function mountWith(record, options, locale = 'fr') {
  const i18n = createI18n({ messages, locale })
  let api
  mount(
    {
      setup() {
        api = useRecordLanguage(record, options)
        return () => null
      },
    },
    { global: { plugins: [i18n] } },
  )
  return { ...api, locale: i18n.locale }
}

describe('resolveRecordLanguage', () => {
  it('reads the record in the site language when it carries it', () => {
    expect(resolveRecordLanguage(['ar', 'fr', 'en'], 'fr')).toBe('fr')
  })

  it('falls back to English', () => {
    expect(resolveRecordLanguage(['ar', 'en'], 'fr')).toBe('en')
  })

  it('then to the first language the record carries', () => {
    expect(resolveRecordLanguage(['ar', 'de'], 'fr')).toBe('ar')
  })

  it('stays on the site language for a record that says nothing', () => {
    expect(resolveRecordLanguage([], 'fr')).toBe('fr')
  })
})

describe('useRecordLanguage', () => {
  it('follows the site language and the record, and exposes the direction', () => {
    const record = ref({ id: '1', languages: ['ar', 'en'] })
    const { language, languages, dir } = mountWith(record, {})
    expect(languages.value).toEqual(['ar', 'en'])
    expect(language.value).toBe('en')
    expect(dir.value).toBe('ltr')
    record.value = { id: '2', languages: ['ar'] }
    expect(language.value).toBe('ar')
    expect(dir.value).toBe('rtl')
  })

  it('lets the visitor toggle the record without touching the site language', () => {
    const record = ref({ id: '1', languages: ['ar', 'fr', 'en'] })
    const { language, select, locale } = mountWith(record, {})
    select('ar')
    expect(language.value).toBe('ar')
    expect(locale.value).toBe('fr')
    select('de') // not carried: ignored
    expect(language.value).toBe('ar')
  })

  it('forgets the toggle when the site language changes', async () => {
    const record = ref({ id: '1', languages: ['ar', 'fr', 'en'] })
    const { language, select, locale } = mountWith(record, {})
    select('ar')
    locale.value = 'en'
    await nextTick()
    expect(language.value).toBe('en')
  })

  it('forgets the toggle when another record is shown', async () => {
    const record = ref({ id: '1', languages: ['ar', 'fr', 'en'] })
    const { language, select, reset } = mountWith(record, {})
    select('ar')
    record.value = { id: '2', languages: ['ar', 'fr', 'en'] }
    await nextTick()
    expect(language.value).toBe('fr')
    select('ar')
    reset()
    expect(language.value).toBe('fr')
  })

  it('reads the languages of an entity when the record does not say', () => {
    const record = ref({ id: '1' })
    const { languages, language } = mountWith(record, { entity: 'things' }, 'de')
    expect(languages.value).toEqual(['en', 'fr'])
    expect(language.value).toBe('en')
  })

  it('takes an explicit language list over both', () => {
    const record = ref({ id: '1', languages: ['ar'] })
    const { languages } = mountWith(record, { languages: () => ['de', 'fr'] })
    expect(languages.value).toEqual(['de', 'fr'])
  })
})
