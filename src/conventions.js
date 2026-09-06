import { computed, toValue } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from './i18n/index.js'
import { entityRef } from './composables/useEntities.js'

// Three small conventions each website had written for itself.

// ── Project names ──────────────────────────────────────────────────────────
//
// `mwnf3.projectnames`, the whole table rather than the projects a website
// happens to borrow from, since that set moves with every reimport. The key
// on the left is data; the entry on the right is a shared text
// (`core.project.*` in viewer-i18n), written out so a reader can see the
// eight this asks for. A key that is not here reads as itself.
export const PROJECT_ENTRIES = Object.freeze({
  ISL: 'core.project.islamicArt',
  EPM: 'core.project.explorePartners',
  DBA: 'core.project.baroqueArt',
  BAR: 'core.project.baroqueArt',
  AWE: 'core.project.sharingHistory',
  awe: 'core.project.sharingHistory',
  DCA: 'core.project.carpetArt',
  DGA: 'core.project.glassArt',
  EXTHE: 'core.project.tableIsSet',
  GALLERIES: 'core.project.galleries',
})

/** The name of a project by its legacy key, through `t`; the key itself when unknown. */
export function projectName(key, t) {
  const entry = PROJECT_ENTRIES[key]
  return entry ? t(entry) : (key ?? '')
}

/** `projectName` bound to the installed texts, for a component. */
export function useProjectName() {
  const { t } = useI18n()
  return (key) => projectName(key, t)
}

// ── The section a route belongs to ─────────────────────────────────────────
//
// A route says what section it is (`meta: { section: 'collection' }`), and
// the shell reads it here for the banner title or the active menu entry.
// Four shells derived the same thing from `route.path.startsWith(…)` chains
// of nine branches each; a route already knows.
export function useSection() {
  const route = useRoute()
  return computed(() => String(route.meta?.section ?? ''))
}

// ── A featured record ──────────────────────────────────────────────────────

// mulberry32 — a small seedable generator, so a test can pin the pick.
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * One record of `entity` chosen at random for a landing page's spotlight —
 * among those with an image when `withImage` is set (the default), among
 * all when none has one. Null until the entity is loaded. The pick is made
 * once per visit and again only when the records change; `seed` makes it
 * deterministic.
 */
export function useFeaturedRecord(entity, { withImage = true, seed, images = 'images' } = {}) {
  const records = entityRef(entity)
  const random = seed == null ? Math.random : seeded(seed)
  return computed(() => {
    const all = toValue(records) ?? []
    if (all.length === 0) return null
    const pool = withImage ? all.filter((record) => (record?.[images]?.length ?? 0) > 0) : all
    const candidates = pool.length > 0 ? pool : all
    return candidates[Math.floor(random() * candidates.length)] ?? null
  })
}
