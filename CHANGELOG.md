# Changelog

## 1.6.0

The alignment pass (metanull/inventory-app#1683): one architecture for every
website, provided here so no site has to build its own.

- `useEntities(names)` / `loadEntities` / `byId` (#32): the standard way a
  website reads its records — one shared ref per entity, `null` until its
  chunk arrives, one cache. A route declaring `meta.entities` has them
  loaded before its view is created; the page shows `core.status.loading`
  until the first route has resolved. `import … from '@inventory-data/…'`
  in site code is forbidden.
- `useRecordLanguage(record)` (#33): the record language, independent of the
  site language — site language, then English, then the record's first;
  a transient toggle that never touches the URL or the site language; `dir`.
- `renderPlain(text)` (#34), next to `renderBlock`/`renderInline`, and the
  Markdown tests the seven websites carried, moved here. `marked` stops
  being a site dependency. The three renderers are also exported from
  `@metanull/viewer-core/i18n`.
- The routing convention (#35): a default `scrollBehavior`, redirect-only
  `config.legacyRoutes`, `NotFoundView` on a `/:pathMatch(.*)*` catch-all
  (`config.notFound` to replace it or leave it out). `NotFoundView` reads
  `core.notFound.page`, published in viewer-i18n 1.6.0.
- `offeredLanguages()` and `languageLabels()` (#36): the one rule deciding
  what a website offers, read from `manifest.site.languages`; the shared
  check `checkOfferedLanguages` on the new `@metanull/viewer-core/testing`
  entry point.
- `config.media` and `config.links` (#37), `useSiteConfig()` and
  `mediaUrl(path, size)`: no site reads `import.meta.env` or carries an
  address outside `dataset.config.js`.

## 1.5.0

- `renderBlock`/`renderInline` gain an optional `glossary` — `[{ id, spelling }]`
  — that highlights every occurrence of a spelling as
  `<span class="gloss-term" data-gid="…">`, as a marked inline extension: a
  token the parser produces, not HTML smuggled through the source. Escaping
  of raw HTML is unaffected — it is a second `Marked` instance built per
  distinct glossary (cached), not a relaxation of the existing one.
- Fixes [#30](https://github.com/metanull/viewer-core/issues/30): three
  websites built their own glossary highlighting by wrapping spellings in
  that same span *before* handing the text to this package, which escaped it
  like any other raw HTML the moment 1.3.0 started escaping raw HTML on
  sight. The span was never in the record — the sites' own `glossify()` is
  now redundant and gets deleted there.

## 1.4.0

- `useDataPackage()` gains `availableLanguages(entity)`, `loadTranslations(entity, lang)`,
  `translations(entity, lang)` and `tr(entity, id, lang, fallbackLang)` — a shared,
  glob-based way to lazy-load `translations/<entity>.<lang>.json` by name.
- Four websites (carpets, amulets, water-in-islam, the-use-of-colours-in-art) had
  already hand-rolled this same logic independently, near-identically, because
  nothing shared provided it. Three others (islamicart, baroqueart,
  sharinghistory) instead resolved one language — items — with
  `` import(`.../items.${lang}.json`) ``: a dynamic import with an interpolated
  specifier, which a bundler cannot resolve statically, so it bundles every
  language of that entity eagerly instead of lazily loading the one requested.
  For islamicart, whose `translations/` totals ~28 MB across 62 files, this
  made the production build unable to finish in CI. All seven websites now
  read translations the one way this exports.

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

