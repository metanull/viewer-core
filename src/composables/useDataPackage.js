import { ref } from 'vue'

// package.json is npm metadata, not an entity — exclude it from the glob.
const entityModules = import.meta.glob(['@inventory-data/*.json', '!**/package.json'])
const manifestModules = import.meta.glob('@inventory-data/manifest.json', { eager: true })

// One file per entity per language; a file is simply absent when that entity
// has no translation in that language. Left lazy (unlike entityModules'
// eager-in-spirit-but-actually-per-call loaders, this one also needs a
// reactive cache — see below) so a build only bundles what a page visit
// actually requests, not every language of every entity.
const translationModules = import.meta.glob('@inventory-data/translations/*.json')

const manifest = Object.values(manifestModules)[0]?.default ?? {}

const entityLoaders = {}
for (const [path, load] of Object.entries(entityModules)) {
  const name = path.split('/').pop().replace(/\.json$/, '')
  if (name !== 'manifest') {
    entityLoaders[name] = load
  }
}

function translationLoader(entity, lang) {
  const suffix = `/translations/${entity}.${lang}.json`
  const path = Object.keys(translationModules).find((k) => k.endsWith(suffix))
  return path ? translationModules[path] : null
}

// `${entity}.${lang}` → record map, or `{}` once a miss has been resolved.
// A plain `await import()` would already be deduped by the module system;
// this cache exists so a component reading through `translations`/`tr` -
// synchronous, not awaited - re-renders once a lazy `loadTranslations` call
// elsewhere resolves.
const translationCache = ref({})

export function useDataPackage() {
  return {
    manifest,
    languages: manifest.languages ?? ['en'],
    entityNames: Object.keys(entityLoaders).sort(),
    async loadEntity(name) {
      const load = entityLoaders[name]
      if (!load) {
        throw new Error(`Unknown entity "${name}" in the data package`)
      }
      const module = await load()
      return module.default ?? module
    },

    /** Languages `translations/<entity>.<lang>.json` actually exists for. */
    availableLanguages(entity) {
      const prefix = `/translations/${entity}.`
      return Object.keys(translationModules)
        .filter((k) => k.includes(prefix))
        .map((k) => k.slice(k.lastIndexOf(prefix) + prefix.length, -'.json'.length))
    },

    /**
     * Lazy-loads `translations/<entity>.<lang>.json` (a map of record id to
     * that record's translated fields); `{}` when the file does not exist.
     * Cached, so calling it again for the same pair is free.
     */
    async loadTranslations(entity, lang) {
      const key = `${entity}.${lang}`
      if (translationCache.value[key]) return translationCache.value[key]
      const load = translationLoader(entity, lang)
      let data = {}
      if (load) {
        try {
          data = (await load()).default ?? {}
        } catch {
          data = {}
        }
      }
      translationCache.value = { ...translationCache.value, [key]: data }
      return data
    },

    /** Already-loaded translations for one entity/lang; `{}` if not loaded yet (or absent). */
    translations(entity, lang) {
      return translationCache.value[`${entity}.${lang}`] ?? {}
    },

    /**
     * One record's translated fields, falling back to `fallbackLang` (default
     * `'en'`) then to `{}`. Reads only what is already loaded — call
     * `loadTranslations` first for each language a page may need.
     */
    tr(entity, id, lang, fallbackLang = 'en') {
      return (
        translationCache.value[`${entity}.${lang}`]?.[id] ??
        translationCache.value[`${entity}.${fallbackLang}`]?.[id] ??
        {}
      )
    },
  }
}
