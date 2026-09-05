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
| `offeredLanguages({ declared?, entity = 'items' })` | `declared ∩ availableLanguages(entity)`, in the declared order; `declared` defaults to `manifest.site.languages`. A package that declares none offers every language its items have content in, alphabetically. |
| `languageLabels(codes)` | `[{ code, label }]` for the switcher, the label from the manifest and the code in capitals where there is none |

The rule is tested once, by the helper every website runs in its own suite:

```js
import { checkOfferedLanguages } from '@metanull/viewer-core/testing'
expect(checkOfferedLanguages(config)).toEqual([])
```

It reports every offered language without item content, an order that is
not the declared one, a switcher that lists something else, and a language
without a label.

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

| Export | Route | Props | Renders |
| --- | --- | --- | --- |
| `HomeView` | `/` | — | `siteName` + links to each configured entity list |
| `ListView` | `/<entity>` | `entity`, `pageSize` (default 20) | paginated record list (`?page=N`), links to details |
| `DetailView` | `/<entity>/:id` | `entity`, `id` | one record; string fields rendered as markdown |
| `NotFoundView` | `/:pathMatch(.*)*` | — | `core.notFound.page` and a link home |

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
