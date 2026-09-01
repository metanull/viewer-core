import { defineComponent, createApp, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { createI18n, mergeMessages, useI18n } from '../src/i18n/index.js'
import { renderBlock, renderInline } from '../src/i18n/markdown.js'
import I18nText from '../src/i18n/I18nText.vue'

function mount(component, i18n) {
  const app = createApp(component)
  if (i18n) app.use(i18n)
  const host = document.createElement('div')
  app.mount(host)
  return { app, host }
}

describe('createI18n', () => {
  const messages = {
    en: { 'core.nav.home': 'Home', 'core.nav.backToList': 'Back to the list' },
    fr: { 'core.nav.home': 'Accueil' },
  }

  it('reads the active language', () => {
    const i18n = createI18n({ messages, locale: 'fr' })
    expect(i18n.t('core.nav.home')).toBe('Accueil')
  })

  it('falls back to English for an entry the language does not have', () => {
    const i18n = createI18n({ messages, locale: 'fr' })
    expect(i18n.t('core.nav.backToList')).toBe('Back to the list')
  })

  it('returns the name itself when no language has the entry', () => {
    const i18n = createI18n({ messages })
    expect(i18n.t('core.nav.missing')).toBe('core.nav.missing')
  })

  it('follows the locale when it changes', () => {
    const i18n = createI18n({ messages })
    expect(i18n.t('core.nav.home')).toBe('Home')
    i18n.locale.value = 'fr'
    expect(i18n.t('core.nav.home')).toBe('Accueil')
  })

  it('provides $t to templates and useI18n() to scripts', () => {
    const i18n = createI18n({ messages })
    const Probe = defineComponent({
      setup() {
        const { t } = useI18n()
        return () => h('p', {}, t('core.nav.home'))
      },
    })
    const { app, host } = mount(Probe, i18n)
    expect(host.textContent).toBe('Home')
    app.unmount()
  })

  it('says so when a component is mounted without texts', () => {
    const Probe = defineComponent({ setup: () => (useI18n(), () => h('p')) })
    expect(() => mount(Probe)).toThrow(/has no texts installed/)
  })
})

describe('mergeMessages', () => {
  it('lets the local catalogue win, entry by entry', () => {
    const merged = mergeMessages(
      { en: { 'gallery.sheet.name': 'Name of Object:', 'gallery.nav.glossary': 'Glossary' } },
      { en: { 'gallery.sheet.name': 'Name of Carpet:' } }
    )
    expect(merged.en['gallery.sheet.name']).toBe('Name of Carpet:')
    expect(merged.en['gallery.nav.glossary']).toBe('Glossary')
  })

  it('keeps languages that appear in only one catalogue', () => {
    const merged = mergeMessages({ en: { a: '1' } }, { fr: { a: '2' } })
    expect(Object.keys(merged).sort()).toEqual(['en', 'fr'])
  })
})

describe('the Markdown pipeline', () => {
  it('renders Markdown', () => {
    expect(renderBlock('A **bold** word.')).toContain('<strong>bold</strong>')
    expect(renderBlock('One.\n\nTwo.')).toContain('<p>Two.</p>')
  })

  it('renders inline Markdown without the surrounding paragraph', () => {
    expect(renderInline('A **bold** word.')).toBe('A <strong>bold</strong> word.')
  })

  it('escapes raw HTML instead of rendering it', () => {
    const html = renderBlock('Hello <script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders a text through the I18nText component', () => {
    const i18n = createI18n({ messages: { en: { 'core.about.body': 'A **bold** claim.' } } })
    const Probe = defineComponent({
      setup: () => () => h(I18nText, { keypath: 'core.about.body' }),
    })
    const { app, host } = mount(Probe, i18n)
    expect(host.innerHTML).toContain('<strong>bold</strong>')
    app.unmount()
  })
})
