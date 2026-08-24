import { createI18n } from 'vue-i18n'
import defaultChrome from './defaults/en.json'

export function createViewerI18n({ languages = ['en'], messages = {} } = {}) {
  const merged = {}
  for (const lang of new Set(['en', ...languages, ...Object.keys(messages)])) {
    merged[lang] = {
      ...(lang === 'en' ? defaultChrome : {}),
      ...(messages[lang] ?? {}),
    }
  }

  return createI18n({
    legacy: false,
    flatJson: true,
    locale: languages[0] ?? 'en',
    fallbackLocale: 'en',
    messages: merged,
  })
}
