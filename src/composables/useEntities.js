import { computed, shallowRef } from 'vue'
import { useDataPackage } from './useDataPackage.js'

// The records of an entity are one thing: loaded once, from the chunk Vite
// emits for that one file, and shared by every page that asks for them. A
// website reads them through here and keeps no copy of its own — the alias
// `@inventory-data` is this package's, and a site file importing from it
// directly ships the whole dataset in its first bundle.

const records = new Map() // entity name → shallowRef(null | records)
const pending = new Map() // entity name → the load in flight
const indexes = new Map() // `${entity}.${key}` → computed Map

function refFor(name) {
  let entry = records.get(name)
  if (!entry) {
    entry = shallowRef(null)
    records.set(name, entry)
  }
  return entry
}

/**
 * The shared ref of one entity, without asking for its load — `null` until a
 * route's `meta.entities` or `loadEntities` brings the chunk in. This is what
 * a website's data composable exports at module level, so that importing the
 * composable loads nothing: the pages that read an entity are the ones that
 * declare it.
 */
export function entityRef(name) {
  return refFor(name)
}

/**
 * Load the named entities, once each. Resolves with their records in the
 * order asked for; a name the package does not have rejects, as `loadEntity`
 * does.
 */
export function loadEntities(names) {
  const { loadEntity } = useDataPackage()
  return Promise.all(
    names.map((name) => {
      const entry = refFor(name)
      if (entry.value !== null) return entry.value
      let load = pending.get(name)
      if (!load) {
        load = loadEntity(name)
          .then((data) => {
            entry.value = data
            pending.delete(name)
            return data
          })
          .catch((error) => {
            pending.delete(name)
            throw error
          })
        pending.set(name, load)
      }
      return load
    }),
  )
}

/**
 * A record map for one entity, keyed on `key` (the package id by default) —
 * empty until the entity is loaded, and rebuilt if it ever reloads.
 */
export function byId(name, key = 'id') {
  const cacheKey = `${name}.${key}`
  let index = indexes.get(cacheKey)
  if (!index) {
    const entry = refFor(name)
    index = computed(() => new Map((entry.value ?? []).map((record) => [record[key], record])))
    indexes.set(cacheKey, index)
  }
  return index
}

/**
 * The standard way a website reads its records.
 *
 * `useEntities(['items', 'partners'])` returns one reactive ref per name —
 * `null` until that entity's chunk has arrived, the records after — plus
 * `ready`, a promise for all of them, `loaded`, the same as a boolean, and
 * `byId`. The refs are the same objects for every caller, so a composable
 * may export them at module level and a view may read them at any time.
 *
 * A route that declares `meta: { entities: [...] }` has them loaded by the
 * router before its view is created, so that view never sees `null`.
 */
export function useEntities(names) {
  const list = Array.isArray(names) ? names : [names]
  const result = { ready: loadEntities(list) }
  for (const name of list) {
    result[name] = refFor(name)
  }
  result.loaded = computed(() => list.every((name) => refFor(name).value !== null))
  result.byId = byId
  return result
}
