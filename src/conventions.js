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

// A member is borrowed from the MWNF project that originally published it,
// and legacy names and colours that project on the item sheet and in the
// results grid — two separate mappings, because legacy keeps them separate:
// the name is per project key (`PROJECT_ENTRIES` above), the colour is per
// project *family*, so ISL and EPM share a swatch and every exhibition
// shares another. The two exhibition sites re-hard-coded this table as
// English literals next to their own copy of the name table, which is why a
// project name translates on the galleries and not on the exhibitions.
export const PROJECT_FAMILIES = Object.freeze({
  ISL: 'ISLandEPM',
  EPM: 'ISLandEPM',
  DBA: 'DBA',
  BAR: 'DBA',
  AWE: 'AWE',
  awe: 'AWE',
  DCA: 'DCA',
  DGA: 'DGA',
  EXTHE: 'EXH',
  GALLERIES: 'Galleries',
})

/** A project's family by its legacy key — legacy's own class names, so a
 * site's CSS reads as the stylesheet it was copied from. A key with no
 * entry falls back to itself, the same rule `projectName` applies. */
export function projectFamily(key) {
  return PROJECT_FAMILIES[key] ?? (key ?? '')
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

// ── A route's `meta.entities` ────────────────────────────────────────────

/**
 * `sectionMeta(chrome)` returns a `meta(section, ...entities)` helper: a
 * route's `meta: { section, entities: [...chrome, ...entities] }` in one
 * call. `chrome` is the entities every page of the site loads regardless of
 * what it is (the DXA sites' `['gallery', 'items', 'partners', 'countries']`
 * — the shell reads them on every route); a route names on top of that only
 * the entities its own page adds. Four DXA configs each wrote this same
 * four-line closure next to their own `chrome` list.
 */
export function sectionMeta(chrome = []) {
  return (section, ...entities) => ({ section, entities: [...chrome, ...entities] })
}

// ── The MWNF portal ─────────────────────────────────────────────────────

/**
 * The addresses every DXA `dataset.config.js` repeats under `links` —
 * the portal and the sibling standalone sites a gallery or an exhibition
 * links out to. Frozen: a site's own `links` may add to this object but
 * copying it is what this replaces.
 */
export const mwnfLinks = Object.freeze({
  portal: 'https://www.museumwnf.org',
  galleries: 'https://galleries.museumwnf.org',
  myCollection: 'https://www.museumwnf.org/mycollection/index.php',
  about: 'https://www.museumwnf.org/about',
  contact: 'https://www.museumwnf.org/about/contact',
  legalNotice: 'https://www.museumwnf.org/about/legal-notice',
  credits: 'https://www.museumwnf.org/about/credits',
  cookies: 'https://www.museumwnf.org/about/cookies',
  overallDatabase: 'https://www.museumwnf.org/database_searchform.php',
  islamicArt: 'https://islamicart.museumwnf.org',
  baroqueArt: 'https://baroqueart.museumwnf.org',
  sharingHistory: 'https://sharinghistory.museumwnf.org',
})
