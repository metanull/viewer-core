# Changelog

## 1.10.0

Wave G of the shared-pages epic (metanull/inventory-app#1695).

### Added

- `useCollectionTree`'s `childType` now also accepts an array (indexed by
  depth below the root) or a function `(node, depth, parent) => boolean`
  (#54, #66, follow-up). A single type applied at every depth was fine for
  sharing history's exhibitions → themes filter (dropping the National
  Context siblings), but its tree has a second level of the same shape one
  layer down — themes → chapters — and a single type dropped the chapters
  along with it. `buildCollectionTree`/`collectionTreeFromThemes` and
  `useCollectionTree` all read the richer form through the same `children()`
  every other method is built on, so `walk()`, `itemsUnder()`, `containing()`
  and the rest follow it for free.
- `useCollectionTree` (#54): a collection tree rooted at a purpose marker
  (`purpose` or an explicit `rootId`), over a flat `collections.json`-shaped
  array — `root`, `byId`, `children(id)`, `parents(id)`, `breadcrumb(id)`,
  `itemsUnder(id)`, `containing(itemId)`, `walk()` (the flattened
  depth-first sequence) and `previous(id)`/`next(id)` over it, crossing a
  theme boundary for free because `walk()` is what they read by index.
  Replaces three standalone composables that each walked `collections.json`
  by `parent_id` and `display_order` and each wrote the same reverse
  "collections containing this item" scan by hand (islamicart, baroqueart,
  sharinghistory). `collectionTreeFromThemes` adapts the DXA sites'
  pre-built `themes.json` (`sub_themes[]`, `pictures[]`) to the same
  interface, so a fourth shape gets it without a second implementation.
  `buildCollectionTree`/`collectionTreeFromThemes` are pure; `useCollectionTree`
  is the reactive form over `entityRef`.
- `useTimelineEvents` (#55): the engine of a Timeline results page, one
  implementation for the three axes legacy split across separate
  endpoints — the worldwide country merge, an exhibition's own narrative
  chronology in its place, and Sharing History's further split by which
  exhibition an event belongs to. The event overlap rule was triplicated
  verbatim across Islamic Art, Baroque Art and Sharing History, mirroring
  legacy `class.hcr.inc.php`, and existed again as `findEvents` in
  carpets' `useTimeline.js`, the best-factored copy; carpets and
  water-in-islam separately wrote the DXA sites' local-chronology handling.
  `overlapsRange`, `effectiveYearTo` and `eventDateLabel` are exported on
  their own, pure. The DXA legacy 2-letter country code table stays out of
  this package — a site that keys its Timeline URLs on it passes its own
  `countryIdForCode`.

## 1.9.1

### Fixed

- A deep link opened the home page. On a multilingual website the language
  watcher rewrote the URL with `?lang=` from the router's start location,
  `/`, before the navigation the visitor arrived with had resolved, and that
  replace cancelled it: `#/timeline` landed on `#/?lang=en`, on every
  website, from every bookmark and every shared link. The watcher now leaves
  the router alone until the first navigation is through — the guard already
  puts the language in that navigation's URL. Found by the template's test of
  the composed pages, which mounts a website on the page under test.

## 1.9.0

Wave E of the shared-pages epic (metanull/inventory-app#1691), this
package's part (#50). Additive.

### Added

- `config.views = { home, list, detail }`: the components that render the
  three slots every website has — `/`, and the `<entity>-list` /
  `<entity>-detail` routes `features.entities` publishes — in place of the
  generic `HomeView`, `ListView` and `DetailView`, which stay the defaults
  and the tools for looking at a new dataset. The composed views a website
  names there are `@metanull/viewer-layout/views`: they are made of that
  package's components on this package's composables, and this package does
  not depend on the layout, which is why they are not here. `resolveViews`
  answers what a configuration resolves to.

## 1.8.0

Wave B of the shared-pages epic (metanull/inventory-app#1691): the engine of
the list pages and the record page, written once. Additive — nothing a
website has changes; the composables exist for the websites to move onto.

### Added

- **List pages** (#42–#46). `useListQuery` — filters and page bound to the
  route query, encoding the routing convention once (eleven views wrote it by
  hand). `paginate` / `usePagination` / `sortChronological` — the DXA page
  shape, which `ListView` now uses too. `facetOptions` / `useFacets` — option
  lists from whatever records the caller hands over, so the standalone rule
  (all records) and the DXA rule (the matching subset) stay the caller's
  choice. `inDateRange` / `dateRange` with the two legacy date rules named,
  `overlap` and `contain`, and a test that pins where they disagree;
  `yearBuckets` / `yearBucketsFromRange` carried verbatim from four copies,
  reading `catalogue.era.*`; `eraLabel`, `roundOutward`. `useKeywordIndex`
  — the field grammar of `database.php` and the boolean full-text grammar of
  the DXA sites under one interface, with the haystack cache invalidated when
  a language's translations change.
- **Record pages** (#48, #49). `useRecordSheet` — on top of
  `useRecordLanguage`: the loads every sheet performs (the record's entity and
  the related entities it names, in the active language *and* in English, so
  the fallback is loaded rather than assumed), `text`, `ready`, the glossary
  terms and the spelling list for the renderers, and an attribution fallback
  across languages for credits the importer filed on one row only.
  `sheetRows` — the field engine: a spec of `{ key, label, value, render,
  when }` in, rendered rows without empties out; the spec stays the site's.
  `useGlossaryPopup`, `searchGlossary`, `citation`, `relatedRecords` /
  `useRelatedRecords`, `timelineLinkFor`.
- **Conventions** (#47). `projectName` / `useProjectName` / `PROJECT_ENTRIES`
  over `core.project.*`; `meta.section` on a route and `useSection()` to read
  it; `useFeaturedRecord` for a landing page's spotlight.
- Fixture: an `objects` entity with dates, a country, tags, images, glossary
  ids and related items, and a `glossary` entity with spellings in two
  languages, so the engine is tested against records shaped like a site's.

## 1.7.1

### Fixed

- `checkOfferedLanguages(config, { declared })` accepts the same narrowing
  `offeredLanguages({ declared })` does. The two helpers were meant to apply
  one rule, but the check only knew the package's declaration, so a website
  that narrows it — Sharing History offers English where its package declares
  English and French — failed its own language test the moment its package
  started declaring site languages. Found by the first data packages that
  carry `manifest.site` (inventory-app#1685).
- `offeredLanguages({ declared })` narrows the package's declaration and no
  longer widens it: a code the website lists that the package does not declare
  for the site is dropped, as the documentation already said it was.

## 1.7.0

### Removed

- The `vue-i18n` bridge and the `vue-i18n` peer dependency (#38). Since 1.2.0
  nothing in this package read its texts through vue-i18n; the library stayed
  installed only because `@metanull/viewer-layout` 1.x and a handful of website
  views still called its `useI18n()`. Those are all migrated now, so the bridge
  module, the `app.use()` call and the locale watch that kept the two in step
  are gone.

  **Breaking for anything that still calls vue-i18n.** An application built
  with `createViewer` no longer installs it, so a component reading
  `useI18n()` from `vue-i18n` throws instead of falling back. Import
  `useI18n` from `@metanull/viewer-core` — the same `{ locale, t }` shape,
  minus interpolation and pluralisation, which this platform does not have.
  `$t` in a template is unaffected: it has been this package's own since 1.2.0.

  Websites keep `vue-i18n` in their own `package.json` only if their own code
  still imports it; none of the seven does.

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

