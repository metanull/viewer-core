# Changelog

## 1.1.0

- Texts are handled here, by a first-party module of about thirty lines, with
  no i18n library: `useI18n()` → `{ t, locale }`, `$t` in templates,
  `mergeMessages()` for the one merge rule (local wins), and `<I18nText>` /
  `<I18nTextInline>` rendering Markdown through `marked` — one pipeline for
  the whole platform, escaping raw HTML rather than passing it through.
- A language service: the language is resolved once from `?lang=`, then the
  visitor's remembered choice, then their browser, then English, skipping
  anything the website does not offer. On a multilingual website the URL
  carries `?lang=`, and `lang` / `dir` are set on `<html>` — so a
  right-to-left language now renders right to left, which it never did.
- The built-in `chrome.*` English strings are gone. Shared texts live in
  `@metanull/viewer-i18n`; this package's own views use `core.*` entries from
  the catalogue the website passes. `chrome.page` ("Page {page} of {total}")
  has no replacement: the position is rendered next to the labels instead of
  inside a text, because a text carrying a number cannot be translated without
  carrying the number's place in the sentence too.
- `vue-i18n` is still installed and nothing here uses it. It stays until
  `@metanull/viewer-layout` 2.0.0 and the websites' own views are migrated —
  see `src/i18n/vue-i18n-bridge.js`.

## 0.2.1

- `useDataPackage` no longer surfaces the data package's own `package.json`
  as an entity (any installed npm package has one; the glob now excludes it).

## 0.2.0

- New optional `config.shell`: a page-shell component (e.g. `PageShell` from
  `@metanull/viewer-layout`) rendered around the active view. It receives
  `languages`, everything in `config.navigation`, and the reactive `language`;
  its `update:language` event sets the global vue-i18n locale.

## 0.1.0

- Initial release: createViewer, useDataPackage, hash router with feature-flagged routes, vue-i18n harness with default English chrome strings, HomeView / ListView / DetailView, structural base.css.

