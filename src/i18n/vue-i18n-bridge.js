import { createI18n as createVueI18n } from 'vue-i18n'

// TRANSITIONAL — to be deleted once no website reads its texts through
// vue-i18n. Tracked in metanull/inventory-app#1637, after Wave 2.
//
// Nothing in viewer-core uses vue-i18n any more. It is still installed because
// two things downstream do, and they are migrated per website rather than all
// at once: `@metanull/viewer-layout` before its 2.0.0, and the websites' own
// views, which call vue-i18n's `useI18n()` to read the content language. Both
// would throw the moment this stopped being provided, so removing it here
// before they are migrated would break every published website at once.
//
// It carries no default texts of its own: those moved to @metanull/viewer-i18n.
// A website that has not migrated still passes its `locales/` files as
// `messages`, which is where its chrome.* and layout.* entries live.
export function createLegacyI18n({ languages = ['en'], messages = {} } = {}) {
  const merged = {}
  for (const language of new Set(['en', ...languages, ...Object.keys(messages)])) {
    merged[language] = { ...(messages[language] ?? {}) }
  }
  return createVueI18n({
    legacy: false,
    flatJson: true,
    locale: languages[0] ?? 'en',
    fallbackLocale: 'en',
    missingWarn: false,
    fallbackWarn: false,
    messages: merged,
  })
}
