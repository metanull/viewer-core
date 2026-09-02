# Changelog

## 1.3.0

- `renderBlock` and `renderInline` take `{ breaks: true }`, for text that comes
  from a record rather than from the dictionary. A field arrives from a database
  where a newline was typed to be a line break; a translated text is prose and
  wraps freely. Same escaping either way.
- `DetailView` renders record fields through that pipeline instead of calling
  `marked.parse` with HTML enabled. The importer converts legacy HTML to
  Markdown on the way in, so a tag reaching a field is a fault upstream: it now
  shows as the characters it is, rather than being rendered and hidden.
- This is the only Markdown pipeline in `viewer-core` again, and it is exported
  so a website does not need a second one.

## 1.2.1

- The texts are keyed on `Symbol.for('@metanull/viewer-core:i18n')` rather than
  a module-local `Symbol`. With two entry points onto the same module, a
  bundler can load it twice — `createViewer` reaching it relatively and
  `viewer-layout` through `/i18n` — and two copies meant two distinct keys: the
  application provided one, the layout injected the other, and `useI18n()`
  threw "no texts installed" in an application that plainly had them. Seen on
  every website's smoke test as soon as `viewer-layout` 2.0.0 was installed
  against one.

## 1.2.0

- New entry point `@metanull/viewer-core/i18n`, exporting the text runtime on
  its own. The package root re-exports `useDataPackage`, whose
  `import.meta.glob` of the data package needs an `@inventory-data` alias, so a
  package that wants only `useI18n` had to define that alias or fail to build.
  `@metanull/viewer-layout` 2.0.0 is the one that needs this; both specifiers
  resolve to the same module, so an application still has one set of texts.

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

