# @metanull/viewer-core

Application engine for MWNF websites. A website repo is a thin shell: it provides a
`dataset.config.js`, its data package and its locale files — this package turns that
into a mounted Vue application (router, i18n, data access, shared views).

Stack: Vue 3, Vue Router (hash history), Vite, Vitest. Distributed as raw
ESM source; the website's Vite build compiles it.

Texts are handled here, without an i18n library: see [Texts](#texts). Nothing in
the platform depends on `vue-i18n` any more, and this package no longer asks for
it.

## Install

Published to GitHub Packages (authentication is always required, even to download).

`.npmrc` in the website repo:

```ini
@metanull:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @metanull/viewer-core vue vue-router
```

Required website-side Vite configuration (`vite.config.js`):

| Setting | Value | Why |
| --- | --- | --- |
| `resolve.alias['@inventory-data']` | path to the installed `@metanull/<dataset>-data` | `useDataPackage` reads all JSON (entities and `translations/`) through this alias |
| `optimizeDeps.exclude` | `['@metanull/viewer-core']` | the package ships `.vue` source; esbuild pre-bundling cannot parse it |
| plugin | `@vitejs/plugin-vue` | compiles the shipped `.vue` views |

## Usage

`main.js` (this is the whole website entry point):

```js
import { createViewer } from '@metanull/viewer-core'
import config from './dataset.config.js'
createViewer(config).mount('#app')
```

## API

### `createViewer(config)` → Vue app (caller mounts it)

`config` is the website's `dataset.config.js` object:

| Key | Type | Required | Meaning |
| --- | --- | --- | --- |
| `datasetPackage` | string | yes | name of the data package, e.g. `@metanull/<dataset>-data` (informational) |
| `siteName` | string | yes | shown on the Home view |
| `languages` | string[] | no | the languages the website offers, from [`offeredLanguages()`](#which-languages-a-website-offers); defaults to the manifest's `languages` |
| `features.entities` | string[] | no | entity names getting list + detail routes (`/<entity>`, `/<entity>/:id`) |
| `views` | `{ home?, list?, detail? }` | no | the components that render the three slots — `/` and the routes `features.entities` publishes — in place of the generic views (see [Views](#views)) |
| `extraViews` | RouteRecord[] | no | website-specific routes appended to the router (see [Routing](#routing)) |
| `routes` | RouteRecord[] | no | raw vue-router records appended after `extraViews` |
| `legacyRoutes` | `[{ path, resolve }]` | no | legacy URL shapes, redirect-only (see [Routing](#routing)) |
| `notFound` | Vue component or `false` | no | the not-found view; `false` leaves the catch-all out |
| `scrollBehavior` | function | no | overrides the router's default scroll rule |
| `shell` | Vue component | no | page-shell component rendered around the active view (see below) |
| `navigation` | object | no | passed through untouched as props of the `shell` component |
| `messages` | `{ [lang]: { [key]: text } }` | no | the website's effective catalogue: the `@metanull/viewer-i18n` bundle it receives, merged with its own `locales/` files (see [Texts](#texts)) |
| `media` | `{ legacyHost }` | no | the host of the legacy media server, for [`mediaUrl()`](#the-declaration-outside-a-component) |
| `links` | object | no | the addresses a website links out to: `portal`, `galleries`, `myCollection`, `about`, `contact`, `legalNotice`, `credits`, `cookies` |

`dataset.config.js` is the whole declaration of a website. Before it mounts,
a website reads nothing from its data package but `manifest.json`; it reads
no environment variable; it carries no address outside `links` and `media`.

### Page shell (`config.shell`)

When `config.shell` is set, the root component renders it around `<router-view/>`
instead of the bare view. The shell is any component honouring this contract:

- receives, via `v-bind`: `languages` (the resolved language list), every key of
  `config.navigation` (untouched), and `language` (the current locale, reactive);
- may emit `update:language` — `createViewer` sets the active language, after
  checking that the website offers it;
- renders its default slot as the page content (that slot is the active view).

`PageShell` from `@metanull/viewer-layout` honours this contract; a website enables
it entirely from `dataset.config.js`:

```js
import { PageShell } from '@metanull/viewer-layout'

export default {
  // …
  shell: PageShell,
  navigation: {
    headerTitle: 'My Museum',
    navLinks: [{ label: 'Home', href: '#/' }],
    footerText: '© My Museum',
  },
}
```

(Navigation links are plain `href`s — with the hash router, `#/things` navigates
without any router coupling in the layout.)

## Texts

A text is a key and a Markdown text. Nothing else: no placeholders, no
interpolation, no pluralisation, no HTML. A value produced at run time — a
number, a date, a count — is rendered by the component *next to* the text,
never inside it, which is what lets a text be translated freely.

Shared texts come from [`@metanull/viewer-i18n`](https://github.com/metanull/viewer-i18n);
a website's own texts come from its `locales/<lang>.json`. The website merges
them and passes the result as `config.messages` — local wins, and that is the
only merge rule:

```js
import { createViewer, mergeMessages } from '@metanull/viewer-core'
import { catalogues } from '@metanull/viewer-i18n/gallery'
import config from './dataset.config.js'

const local = {}
for (const [path, module] of Object.entries(import.meta.glob('../locales/*.json', { eager: true }))) {
  local[path.split('/').pop().replace(/\.json$/, '')] = module.default
}

createViewer({ ...config, messages: mergeMessages(catalogues, local) }).mount('#app')
```

| Export | Use |
| --- | --- |
| `$t(key)` | in a template |
| `useI18n()` → `{ t, locale }` | in `<script setup>` |
| `useLocale()` | the active language, read-only |
| `<I18nText keypath tag="div">` | a text rendered as Markdown (block) |
| `<I18nTextInline keypath tag="span">` | the same, without the surrounding paragraph |
| `mergeMessages(...catalogues)` | the merge rule above |
| `negotiateLanguage`, `isRtl` | the language rules, for a website that needs them directly |
| `renderBlock(text, { breaks, glossary })`, `renderInline(text, { breaks, glossary })`, `renderPlain(text)` | the Markdown pipeline `I18nText`/`I18nTextInline` render through, for a website that needs it directly (a data-package field, not a text) |

The three renderers are the only ones. `renderBlock` gives paragraphs,
`renderInline` a heading or a cell, `renderPlain` plain text for an `alt`,
a `title`, an option label or a sort key: an image becomes its alt text, a
break a space, raw HTML nothing. All three read the same parser and apply
the same escaping, so a website never imports `marked` and never writes a
rendering rule of its own — a field that renders wrongly is fixed in the
importer, where the data is made, not in the site.

`renderBlock`/`renderInline`'s optional `glossary` — `[{ id, spelling }]`, one
entry per spelling of each of a record's glossary words in the active
language — highlights every occurrence as
`<span class="gloss-term" data-gid="…">`, case-insensitively, whole words
only, longest spelling winning when one contains another. It is a token the
parser produces, not HTML in the source: the escaping below still applies to
everything else in the text, code spans and link destinations are left alone,
and an empty or omitted `glossary` costs nothing extra.

A package that needs only the text runtime — `@metanull/viewer-layout` is the
one — imports it from `@metanull/viewer-core/i18n` instead of the package root.
Both resolve to the same module, so there is one set of texts in the
application; the subpath just leaves the router and the data package out of
that build.

`t(key)` returns the text in the active language, falls back to English, and
returns the key itself if neither has it. **Keys at call sites must be written
out in full**, never assembled — that is what lets CI verify that every text a
page asks for exists.

Attributes (`aria-label`, `placeholder`, `title`, `alt`) take `t()`, not the
components.

The scope of this is frozen: lookup, fallback, reactivity. A future need for
pluralisation or interpolation is a different system, not an extension of this
one.

### Language

`createViewer` resolves the language once: `?lang=` in the URL, then the
visitor's remembered choice, then their browser's preferences, then English —
skipping at every step anything the website does not offer. On a website
offering more than one language the URL carries `?lang=`, so a page can be
linked and shared in the language it was read in; a single-language website
never gets the parameter. `lang` and `dir` are set on `<html>`, so a
right-to-left language renders right to left.

### Which languages a website offers

One rule for every website: the package declares the site's languages in
`manifest.site.languages`, in switcher order, each with its native label;
the website offers those that its items actually have content in.

```js
import { languageLabels, offeredLanguages } from '@metanull/viewer-core'

const languages = offeredLanguages()
export default {
  languages,
  navigation: { languages: languageLabels(languages) },
}
```

| Export | Meaning |
| --- | --- |
| `offeredLanguages({ declared?, entity = 'items' })` | `declared ∩ availableLanguages(entity)`, in the declared order; `declared` defaults to `manifest.site.languages`, and a website's own `declared` can only narrow that list, never widen it. A package that declares none offers every language its items have content in, alphabetically. |
| `languageLabels(codes)` | `[{ code, label }]` for the switcher, the label from the manifest and the code in capitals where there is none |

The rule is tested once, by the helper every website runs in its own suite:

```js
import { checkOfferedLanguages } from '@metanull/viewer-core/testing'
expect(checkOfferedLanguages(config)).toEqual([])
```

It reports every offered language without item content, an order that is
not the declared one, a switcher that lists something else, and a language
without a label. A website that narrows the package's declaration passes the
same list to the check — `checkOfferedLanguages(config, { declared })` — so
that it is held to the rule it actually applies.

### Record language

The site language and the language a record is read in are two different
things. The site language is negotiated once and holds for the whole visit;
a record may carry languages the site does not offer. A record renders in
the site language when it carries it, in English when it does not, in its
first language when it has neither — and the visitor may toggle the record
they are reading into any language it carries. That toggle is view state:
not in the URL, never changing the site language, forgotten when the site
language changes or another record is shown.

```js
import { useRecordLanguage } from '@metanull/viewer-core'
const { language, languages, dir, select, reset } = useRecordLanguage(item)
```

`item` is a ref, a computed or a getter; `item.languages` says what it
carries (`{ entity: 'items' }` reads the entity's translation files when a
record says nothing; `{ languages: () => [...] }` overrides both). `language`
is the resolved language, `dir` its direction for a `dir` attribute,
`select(code)` the visitor's toggle, `reset()` its undo.

### Records: `useEntities()` (the standard way a website reads them)

Every entity is one hashed chunk, fetched the first time a page asks for it
and shared by every page after. A website never imports a package file
itself — `import … from '@inventory-data/…'` in site code is forbidden — and
keeps no copy of the records: it reads them through here.

```js
import { computed } from 'vue'
import { entityRef } from '@metanull/viewer-core'

export const items = entityRef('items')
export const partners = entityRef('partners')
export const itemById = computed(() => new Map((items.value ?? []).map((i) => [i.id, i])))
```

| Member | Meaning |
| --- | --- |
| `<name>` | a shared ref per requested entity: `null` until its chunk has arrived, the records after |
| `ready` | a promise for all of them |
| `loaded` | the same, as a boolean |
| `byId(name, key = 'id')` | a cached `computed` Map of the records by `key` |
| `loadEntities(names)` | the load itself, for a route guard or a resolver |
| `entityRef(name)` | the shared ref alone, loading nothing — what a data composable exports at module level, so that importing it costs nothing and the routes that read an entity are the ones that declare it |

A route that declares `meta: { entities: ['items'] }` has them loaded by the
router before its view is created, so the view never sees `null`; until the
first route has resolved, the page shows `core.status.loading`.

### List pages

The engine of a results page — what every website's browse and search
pages do before they render a row. Behaviour only; the controls and rows are
viewer-layout's, and which filters exist, in what order, with what labels,
is the site's.

| Export | Meaning |
| --- | --- |
| `useListQuery({ keys, page = true })` | `{ filters, page, active, apply(patch), reset(), goToPage(n) }` — filters and page bound to the route query. Encodes the routing convention once: filters in the query, `page` dropped when 1, `push` for a filter change (a new place in history), `replace` for a page change, page back to 1 when a filter changes; navigates on the current route by name. Query parameters the page does not own (`lang`) travel untouched. |
| `paginate(list, page, size = 20)` | `{ total, lastPage, currentPage, from, to, rows }`; a page past the end clamps. The size is the site's: twenty on the standalone sites, nine on the DXA sites. |
| `usePagination(list, { page, size })` | the same over reactive sources |
| `sortChronological(list, { key = 'start_date', undated = 'last' })` | a new array, by year, undated last |
| `facetOptions(records, spec)` / `useFacets(records, spec)` | `{ [facet]: [{ value, label }] }` — the values the records in front of the filter carry, labelled by the site's own helper, sorted. A facet is `{ field }` or `{ values(record) }`, plus `label(value)`, `include(value)`, `sort` (`'label'`, a comparator, `'none'`), `capitalize`. Pass all records for options that never narrow (the standalone rule) or the matching subset for dependent facets (the DXA rule); the helper reads what it is handed. |
| `inDateRange(record, { begin, end, mode })` / `dateRange(list, …)` | the two legacy date rules, named and never merged: `'overlap'` (Islamic Art, Baroque Art, Sharing History — a record whose span touches the window, tolerating one date) and `'contain'` (the DXA sites — a record whose span lies inside it; an undated record is out). A site names its mode once. |
| `yearBuckets(records, t)` / `yearBucketsFromRange(min, max, t)` | the legacy era buckets (`[{ value, label }]`, coarser the further back), whose values are in shareable URLs and therefore reproduced rather than improved; `t` supplies `catalogue.era.*` |
| `eraLabel(year, t)`, `roundOutward(start, end)` | "1193 AD" / "502 BC"; a record's dates rounded outward to the century |
| `useKeywordIndex(entity, { grammar, fields, haystack, language })` | `{ search, reset }` — the two search engines under one interface. `grammar: 'fields'`: `fields` maps a field name to `(record, text) => string \| string[]`, `search([{ field, keyword, cond }])` folds the rows with AND/OR (the `database.php` form). `grammar: 'boolean'`: `haystack(record, text)` returns the strings searched, `search('+word -word word* "a phrase"')` ranks by the legacy full-text grammar. `language` is the translation the text is read in. Every value is read as plain text through the pipeline; haystacks are cached per record and language and dropped when that language's translations change. |

### Timelines

Legacy's country chronology (`hcr`) is one merged, year-ordered list per
country, and an exhibition can carry its own narrative chronology instead
(`source: 'thg_local'` on its `timelines.json` row) or split the merge by
which exhibition each event belongs to (Sharing History). Seven websites'
Timeline pages are all one of these three axes over the same event shape.

| Export | Meaning |
| --- | --- |
| `useTimelineEvents({ scope, countryLabel, countryIdForCode, tr, timelinesEntity, eventsEntity })` | `{ countries, yearRange, yearBuckets(t), hasTimeline, usesLocalTimeline, findEvents({ country, collection, begin, end }) }`. `scope` is `'country'` (the worldwide merge), `'local'` (an exhibition's own `thg_local` chronology in place of the merge — `countries` is empty, there is nothing to filter by) or `'collection'` (the merge again, plus a `collection` filter on the exhibition a timeline is bound to, `null` meaning the Permanent Collection). `countries` is one entry per country with a chronology, `{ value, label }`, alphabetized, with an `{ value: 'all', label: null }` marker first (never, for `'local'`) — the marker carries no label of its own so a picker names it through its own catalogue entry. `countryLabel(id)` labels a country; the DXA legacy 2-letter code table stays out of this package, so a site passing one instead resolves it through `countryIdForCode(code)`. `tr(id)` returns an event's translated fields, already resolved for entity and language, the same way a site's own data composable already binds it. `findEvents` returns the scope's events in `[begin, end]`, chronological, `display_order` breaking a tie on `year_from`, an event with no year at all last. |
| `overlapsRange(event, begin, end)` | legacy `class.hcr.inc.php`'s overlap rule, standalone: a dated event overlaps once its known end is past `begin` and its start is before `end`; an open-ended event (no known end) overlaps on its start alone; an undated event matches nothing but an unbounded search. |
| `effectiveYearTo(event)` | `event.year_to`, or `null` when it is `0` or absent — legacy's convention for an open-ended period. |
| `eventDateLabel(event, text, t)` | the label under an event, trying in order: a narrative chronology's own period name (`text.name` — a sort key there, not a label), a curated description pair (`text.date_from_description` / `text.date_to_description`), and the derived year range through `eraLabel`, for the worldwide merge which has neither. |

### Record pages

The engine of a record page, on top of `useRecordLanguage`. The field list
is the site's — `sheetRows` turns a spec into rows — and the components are
viewer-layout's.

| Export | Meaning |
| --- | --- |
| `useRecordSheet(record, { entity, translations, attribution })` | what `useRecordLanguage` returns, plus `text` (the record's translation in the active language, falling back to English), `ready` (the entity and every named related entity loaded, in the active language and in English), `terms` (`[{ id, word, definition, spellings }]` for the record's `glossary_ids`, in the active language), `glossary` (the `[{ id, spelling }]` list the renderers take) and `attribution` — when `attribution: ['author', 'copy_editor']` names fields that are proper names, the first other language of the record that has them supplies them (`{ from, author, … }`), because the importer files some records' credits on one language only. |
| `sheetRows(spec, ctx)` | `[{ key, label, render, value, html }]` from `[{ key, label, value, render, when, join }]`: `value` a function of `ctx` or the name of a field of `ctx.text`; `render` one of `inline`, `block`, `plain` (through the pipeline, with `ctx.glossary`), `link`, `custom` (handed back for a slot); `when(ctx)` gates the row; empty values are dropped. "Materials/techniques" on one site and "Type" on another for the same field are both legacy facts, and both are a spec entry. |
| `useGlossaryPopup(entries)` | `{ active, onClick, close }` — one delegated click on the sheet's container answers the term rendered as `.gloss-term` |
| `searchGlossary(input, language)` | the terms whose spelling starts with the input, for a glossary search box |
| `citation({ author, name, project, publisher, year, permalink, inWord })` | the sentence under a sheet, assembled from parts in order rather than written into a text with holes |
| `relatedRecords(record, { entity, language })` / `useRelatedRecords` | `{ inPackage: [{ reference, record, justification }], outside: [reference] }` — a reference the package does not hold stays a reference; nothing is dropped and nothing invented |
| `timelineLinkFor(record, { name, keys, country, round })` | the route location of the timeline results for the record's country and dates, or null |

### Collection trees

`useCollectionTree` — a collection tree rooted at a purpose marker, over a
flat `collections.json`-shaped array (`{ id, parent_id, display_order, type,
purpose, items }`). Four sites each walked this tree from a purpose marker
by hand — three by `parent_id`/`display_order` over `collections.json`
(islamicart's Artistic Introduction and Exhibitions, baroqueart, sharing
history's Exhibitions/themes/chapters), one with the equivalent tree
pre-built as `themes.json` (the DXA sites) — and each wrote the same reverse
"collections containing this item" scan by hand. This is that walk, written
once.

```js
import { useCollectionTree } from '@metanull/viewer-core'

const exhibitions = useCollectionTree({ purpose: 'exhibitions-root', entity: 'collections' })
const { root, children, breadcrumb, itemsUnder, containing, previous, next } = exhibitions
```

| Export | Meaning |
| --- | --- |
| `useCollectionTree({ purpose \| rootId, childType?, entity = 'collections', order = 'display_order' })` | the reactive form, over `entityRef(entity)`: empty (not an error) until that entity's chunk has arrived. `purpose` finds the root by its `purpose` field; `rootId` takes a node's id directly (for a site that resolves a marker's single child as the real root itself, as islamicart's Artistic Introduction does). `childType` filters a node's children by `type`, in one of three forms: a string holds every level to that one type — not only the root's — for a tree whose marker also parents siblings that are not real tree nodes (sharing history's country-specific "National Context" collections, which sit next to the real themes); an array, indexed by depth below the root (`['theme', 'subtheme']`: depth 1 keeps `theme`, depth 2 keeps `subtheme`, a depth past the end of the array is unfiltered), for a tree whose own levels are different types — sharing history's themes *and* chapters, where a single type at every depth would drop the chapters; a function `(node, depth, parent) => boolean` for anything else. |
| `root`, `byId` | reactive: the root node (`null` if the purpose/id is not found), and a `Map` of every node in the tree by id |
| `children(id)` | a node's children, in `order` |
| `parents(id)` | the ancestor chain, root-first, node itself excluded |
| `breadcrumb(id)` | `parents(id)` plus the node itself |
| `itemsUnder(id)` | the item ids under a node — its own plus every descendant's, depth-first, each once |
| `containing(itemId)` | the nodes an item is directly attached to (not recursive — a page's items do not make its theme "contain" them; walk up with `parents` from what this returns for that) |
| `walk()` | the tree flattened depth-first, root excluded |
| `previous(id)` / `next(id)` | over `walk()`, by index — which is what crosses a branch boundary for free, and is `null` at either end or for an id the tree does not carry |
| `buildCollectionTree(collections, { purpose \| rootId, childType?, order? })` | the pure function `useCollectionTree` reads through `entityRef` for; usable directly outside a component. `childType` takes the same string / array / function forms as above. |
| `collectionTreeFromThemes(themes, { childType?, order? })` | the same interface from a `themes.json` shape (`sub_themes[]` nested, `pictures[].picture_item_id` for content) instead of a flat, `parent_id`-linked array. `root` is always `null` — a `themes.json` package is already the whole tree, an ordered array of top-level themes, with no marker record to key a root on. Also reachable reactively as `useCollectionTree({ source: 'themes', entity: 'themes' })`, where `purpose`/`rootId` do not apply. |

### Partners

Seven partner lists group by country seven ways — the standalone sites
bucket a country's partners into "main" and "associated" on a `level`
field and render an accordion; the DXA sites group the same way with an
A–Z / Z–A toggle and no tiers. `parent_id` is carried on a third of the
standalone partners and read nowhere: legacy nested an associated partner
under the main partner it belongs to.

| Export | Meaning |
| --- | --- |
| `groupByCountry(records, { label, tier?, order = 'asc' })` | `[{ country, label, main, associated }]`, one entry per distinct `country_id`, sorted by `label`. `label(country)` names a group's country, the same shape as a facet's `label(value)`. `tier` names the field that marks a main partner (the converged shape's `level`); its value `'partner'` marks main, anything else — including a record the field is absent from — is associated. Without a `tier` every record is main, which is the DXA lists' plain grouping. Partners keep the order `records` was given in within each tier. |
| `partnerHierarchy(partners)` | `{ children(id), parentOf(id), roots }` from `parent_id`: `children(id)` a partner's associated partners, `parentOf(id)` the main partner it belongs to (or null), `roots` every partner with no parent in the list or whose `parent_id` points outside it. |

### Conventions

| Export | Meaning |
| --- | --- |
| `projectName(key, t)` / `useProjectName()` / `PROJECT_ENTRIES` | a project's name by its legacy key (`ISL`, `EPM`, `DBA`, `BAR`, `AWE`, `DCA`, `DGA`, `EXTHE`, `GALLERIES`), through `core.project.*`; an unknown key reads as itself |
| `useSection()` | the `meta.section` of the current route — see Routing |
| `useFeaturedRecord(entity, { withImage = true, seed })` | one record at random for a landing page's spotlight, among those with an image; null until the entity is loaded; `seed` pins the pick |

### The declaration outside a component

| Export | Meaning |
| --- | --- |
| `useSiteConfig()` | the configuration `createViewer` received, injected inside a component and read from the application outside one |
| `mediaUrl(path, size = 'hi_res')` | `${config.media.legacyHost}/${size}/${path}` for a legacy media path the package carries; an address is returned as it is |

### `useDataPackage()` → data access (the only allowed way to read the data package)

| Member | Type | Meaning |
| --- | --- | --- |
| `manifest` | object | parsed `manifest.json` |
| `languages` | string[] | `manifest.languages`, default `['en']` |
| `entityNames` | string[] | one entry per `<entity>.json` file |
| `loadEntity(name)` | `Promise<Array>` | lazy-loads and returns the records of one entity |
| `availableLanguages(entity)` | string[] | languages `translations/<entity>.<lang>.json` actually exists for |
| `loadTranslations(entity, lang)` | `Promise<object>` | lazy-loads `translations/<entity>.<lang>.json` (id → translated fields); `{}` if the file is absent. Cached. |
| `translations(entity, lang)` | object | the already-loaded map for that pair; `{}` if not loaded yet |
| `tr(entity, id, lang, fallbackLang = 'en')` | object | one record's translated fields, falling back to `fallbackLang` then `{}` — reads only what's already loaded |

Always resolve a per-language file by name through `loadTranslations`/`translations`/`tr` —
never `import(\`...${lang}...\`)`. A dynamic import with an interpolated
specifier can't be resolved statically, so the bundler falls back to bundling
every language of that entity eagerly instead of Vite's dedicated glob-import
path; for a dataset with a large or many-language translation set this can
turn a several-second build into a build that hangs for hours in CI — this is
what made islamicart's production build unable to finish.

### Routing

The convention, applied by the router every website shares:

- hash history; every route named, in kebab-case;
- a section is `/<section>`, a record `/<section>/:id` with the package id
  (`/item/:id`, `/partner/:id`, `/theme/:id`); a sub-list is a path under
  its parent (`/partner/:id/objects`);
- the language, the page and every filter travel in the query, never in the
  path: `?lang=fr`, `?page=2`, `?country=…`;
- a legacy URL shape is a `legacyRoutes` entry, which only ever redirects:
  `{ path, resolve(params, route) }`, `resolve` answering the canonical
  location (`{ name, params }` or a path) or nothing, which is the not-found
  page. It may be async, so a website can load the entity it maps a legacy
  key through `backward_compatibility` with;
- a route says what section it belongs to — `meta: { section: 'collection' }`
  — and a shell reads it with `useSection()` for the banner title or the
  active menu entry, instead of deriving it from the path;
- a `/:pathMatch(.*)*` catch-all lands on `NotFoundView` (`core.notFound.page`),
  or on the component `config.notFound` names;
- the router owns scrolling: back to where the visitor was when they come
  back through history, to the anchor the URL names, where it is when only
  the query of the same page changed, to the top otherwise. No shell and no
  view scrolls the window.

```js
export default {
  extraViews: [
    { path: '/item/:id', name: 'item', component: () => import('./views/ItemSheet.vue'), meta: { entities: ['items'] } },
  ],
  legacyRoutes: [
    {
      path: '/database-item/:uid(.*)/:language',
      async resolve({ uid }) {
        await loadEntities(['items'])
        const item = itemByUid.value.get(uid)
        return item ? { name: 'item', params: { id: item.id } } : null
      },
    },
  ],
}
```

### Views

Every website has three slots — the home page, a list page, a record page —
and this package renders each with a generic view unless the website names
another:

| Slot | Route | Generic view | Props | Renders |
| --- | --- | --- | --- | --- |
| `home` | `/` | `HomeView` | — | `siteName` + links to each configured entity list |
| `list` | `/<entity>` | `ListView` | `entity`, `pageSize` (default 20) | paginated record list (`?page=N`), links to details |
| `detail` | `/<entity>/:id` | `DetailView` | `entity`, `id` | one record; string fields rendered as markdown |
| — | `/:pathMatch(.*)*` | `NotFoundView` | — | `core.notFound.page` and a link home |

The generic views exist to look at a new dataset: they expose the data
package's shape, not the website's. A real website names its pages in
`config.views`, and the same route names — `home`, `<entity>-list`,
`<entity>-detail` — then render them. The composed views of
`@metanull/viewer-layout/views` (`HomeView`, `CatalogueResultsView`,
`RecordView`) are what a website names there: a landing page, a results
page and a record page built from the components of that package on the
composables of this one, driven by a spec the website declares. They live
in the layout package because they are made of its components, and this
package does not depend on it.

```js
import { CatalogueResultsView, HomeView, RecordView } from '@metanull/viewer-layout/views'

export default {
  features: { entities: ['items'] },
  views: { home: HomeView, list: CatalogueResultsView, detail: RecordView },
  home: { cards: [...], featured: { entity: 'items' } },
}
```

A website that registers its own component on the `home` name in
`extraViews`, or its own results and record routes, keeps it: `views` only
fills the slots the website leaves to the package. `resolveViews(config)`
answers the three components a configuration resolves to.

### Styles

`@metanull/viewer-core/styles/base.css` (auto-imported by `createViewer`): reset and
structural rules only. It consumes CSS custom properties and never defines brand values:

| Property | Default |
| --- | --- |
| `--vc-font-body` | `system-ui, sans-serif` |
| `--vc-line-height` | `1.5` |
| `--vc-color-background` | `transparent` |
| `--vc-color-text` | `inherit` |
| `--vc-content-width` | `60rem` |
| `--vc-content-padding` | `1.5rem` |
| `--vc-weight-label` | `600` |

## Data package contract

| File | Content |
| --- | --- |
| `manifest.json` | at least `{ "languages": ["en", ...] }` — every language any record carries. `site.languages`: the languages the website offers, in switcher order, `[{ "code": "fr", "label": "Français" }, …]`. `site.names`: the site's name per language, `{ "en": "…", "fr": "…" }`. A website reads nothing else from its package before it mounts. |
| `<entity>.json` | array of records; each record has an `id`, optional `title`/`name`, other fields free-form (strings may contain markdown) |
| `translations/<entity>.<lang>.json` | optional; object keyed by record `id`, each value the record's translated fields for `<lang>`. A file is simply absent when that entity has no translation in that language. |

## Release procedure

1. Merge to `main` via PR (CI: tests + a downstream build of every website).
2. Create a GitHub release with tag `vX.Y.Z` — CI publishes to GitHub Packages; never publish from a laptop.
3. Semver rules: **patch** = fix; **minor** = backward-compatible addition; **major** = breaking change (breaking = any change requiring an edit in a consuming website).
