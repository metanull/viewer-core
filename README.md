# @metanull/viewer-core

Application engine for MWNF websites. A website repo is a thin shell: it provides a
`dataset.config.js`, its data package and its locale files — this package turns that
into a mounted Vue application (router, i18n, data access, shared views).

Stack: Vue 3, Vue Router (hash history), Vite, Vitest. Distributed as raw
ESM source; the website's Vite build compiles it.

Texts are handled here, without an i18n library: see [Texts](#texts). `vue-i18n`
is still installed as a peer dependency, and nothing in this package uses it —
it is there for `@metanull/viewer-layout` 1.x and for website views that have
not migrated yet, and goes away with them.

## Install

Published to GitHub Packages (authentication is always required, even to download).

`.npmrc` in the website repo:

```ini
@metanull:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @metanull/viewer-core vue vue-router vue-i18n
```

Required website-side Vite configuration (`vite.config.js`):

| Setting | Value | Why |
| --- | --- | --- |
| `resolve.alias['@inventory-data']` | path to the installed `@metanull/<dataset>-data` | `useDataPackage` reads all JSON through this alias |
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
| `languages` | string[] | no | overrides the data package manifest's `languages` |
| `features.entities` | string[] | no | entity names getting list + detail routes (`/<entity>`, `/<entity>/:id`) |
| `extraViews` | RouteRecord[] | no | website-specific routes appended to the router |
| `routes` | RouteRecord[] | no | raw vue-router records appended after `extraViews` |
| `shell` | Vue component | no | page-shell component rendered around the active view (see below) |
| `navigation` | object | no | passed through untouched as props of the `shell` component |
| `messages` | `{ [lang]: { [key]: text } }` | no | the website's effective catalogue: the `@metanull/viewer-i18n` bundle it receives, merged with its own `locales/` files (see [Texts](#texts)) |

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

### `useDataPackage()` → data access (the only allowed way to read the data package)

| Member | Type | Meaning |
| --- | --- | --- |
| `manifest` | object | parsed `manifest.json` |
| `languages` | string[] | `manifest.languages`, default `['en']` |
| `entityNames` | string[] | one entry per `<entity>.json` file |
| `loadEntity(name)` | `Promise<Array>` | lazy-loads and returns the records of one entity |

### Views

| Export | Route | Props | Renders |
| --- | --- | --- | --- |
| `HomeView` | `/` | — | `siteName` + links to each configured entity list |
| `ListView` | `/<entity>` | `entity`, `pageSize` (default 20) | paginated record list (`?page=N`), links to details |
| `DetailView` | `/<entity>/:id` | `entity`, `id` | one record; string fields rendered as markdown |

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
| `manifest.json` | at least `{ "languages": ["en", ...] }` |
| `<entity>.json` | array of records; each record has an `id`, optional `title`/`name`, other fields free-form (strings may contain markdown) |

## Release procedure

1. Merge to `main` via PR (CI: tests + a downstream build of every website).
2. Create a GitHub release with tag `vX.Y.Z` — CI publishes to GitHub Packages; never publish from a laptop.
3. Semver rules: **patch** = fix; **minor** = backward-compatible addition; **major** = breaking change (breaking = any change requiring an edit in a consuming website).
