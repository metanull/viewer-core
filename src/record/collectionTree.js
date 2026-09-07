import { computed } from 'vue'
import { entityRef } from '../composables/useEntities.js'

// Three sites each walked `collections.json` from a purpose marker by
// `parent_id` and `display_order`, and each wrote the same reverse
// "collections containing this item" scan by hand (islamicart, baroqueart,
// sharinghistory). A fourth family — the DXA sites — carries the identical
// shape pre-built as `themes.json` (`sub_themes[]`, `pictures[]`), because
// its importer nests the tree rather than flattening it with `parent_id`.
// This is that walk, written once: a pure indexer over either shape, and a
// composable over `entityRef` for the reactive form a page reads.
//
// A node's own items are read from whichever shape the record carries:
// `items: [{ id, ... }]` (collections) or a flat `item_ids` — a theme node
// has neither; its content is `pictures[].picture_item_id`, so the themes
// adapter passes its own extractor rather than reusing this one.
function itemIdsOfCollection(node) {
  if (Array.isArray(node?.items)) {
    return node.items.map((item) => (item && typeof item === 'object' ? item.id : item)).filter((id) => id != null)
  }
  if (Array.isArray(node?.item_ids)) {
    return node.item_ids.filter((id) => id != null)
  }
  return []
}

function itemIdsOfTheme(node) {
  return Array.isArray(node?.pictures)
    ? node.pictures.map((picture) => picture?.picture_item_id).filter((id) => id != null)
    : []
}

// Legacy's "unordered records sort last" convention (the three composables
// this replaces all wrote `?? 9999` by hand); carried over rather than
// improved, since a package with more than 9999 siblings under one node
// does not exist.
const NO_ORDER = 9999

function orderOf(node, order) {
  const value = node?.[order]
  return typeof value === 'number' ? value : NO_ORDER
}

/**
 * The shared indexer behind `buildCollectionTree` and
 * `collectionTreeFromThemes`: a flat array of `{ id, parent_id, ... }`
 * nodes, a `rootId` among them (or a sentinel none of them carries, for a
 * tree with no root record of its own — see `collectionTreeFromThemes`),
 * and the interface both entry points hand back.
 */
function buildIndex(nodes, rootId, { childType, order = 'display_order', itemIdsOf = itemIdsOfCollection } = {}) {
  const byIdMap = new Map(nodes.map((node) => [node.id, node]))
  const childIds = new Map() // parent id → ordered child ids
  for (const node of nodes) {
    if (node.parent_id == null) continue
    if (!childIds.has(node.parent_id)) childIds.set(node.parent_id, [])
    childIds.get(node.parent_id).push(node.id)
  }
  for (const list of childIds.values()) {
    list.sort((a, b) => orderOf(byIdMap.get(a), order) - orderOf(byIdMap.get(b), order))
  }

  // `childType` is applied at every depth, not just the root's: a marker's
  // direct children are sometimes a mix of the real tree and siblings that
  // only look like it (sharinghistory's country-specific "National Context"
  // collections sit next to the real themes), and a caller who names the
  // type wants it held to at every level it asks about, not only the first.
  function children(id) {
    const kids = (childIds.get(id) ?? []).map((cid) => byIdMap.get(cid)).filter(Boolean)
    return childType ? kids.filter((node) => node.type === childType) : kids
  }

  function parents(id) {
    const chain = []
    let current = byIdMap.get(id)
    while (current && current.parent_id != null && current.parent_id !== current.id) {
      const parent = byIdMap.get(current.parent_id)
      if (!parent) break
      chain.unshift(parent)
      current = parent
    }
    return chain
  }

  function breadcrumb(id) {
    const node = byIdMap.get(id)
    return node ? [...parents(id), node] : []
  }

  /** A node's own item ids plus every descendant's, depth-first, each once. */
  function itemsUnder(id) {
    const node = byIdMap.get(id)
    if (!node) return []
    const seen = new Set()
    const out = []
    const visit = (current) => {
      for (const itemId of itemIdsOf(current)) {
        if (!seen.has(itemId)) {
          seen.add(itemId)
          out.push(itemId)
        }
      }
      for (const child of children(current.id)) visit(child)
    }
    visit(node)
    return out
  }

  // The reverse lookup every site wrote by hand: which collections carry
  // this item directly. Not recursive — a page's items do not make its
  // theme "contain" them for this purpose, the way `itemsUnder` treats them;
  // a caller wanting the enclosing theme or exhibition walks up with
  // `parents` from what this returns, as the sites' own link-builders did.
  function containing(itemId) {
    const out = []
    for (const node of byIdMap.values()) {
      if (itemIdsOf(node).includes(itemId)) out.push(node)
    }
    return out
  }

  // The tree, flattened depth-first, root excluded (the root is the anchor
  // the tree hangs from, not a page a visitor lands on). `previous`/`next`
  // read this sequence by index, which is what makes them cross a branch
  // boundary for free: the last node of one branch is simply followed in
  // the array by the first node of the next, container or leaf alike.
  function walk() {
    const out = []
    const visit = (id) => {
      for (const child of children(id)) {
        out.push(child)
        visit(child.id)
      }
    }
    if (rootId != null) visit(rootId)
    return out
  }

  function previous(id) {
    const sequence = walk()
    const index = sequence.findIndex((node) => node.id === id)
    return index > 0 ? sequence[index - 1] : null
  }

  function next(id) {
    const sequence = walk()
    const index = sequence.findIndex((node) => node.id === id)
    return index !== -1 && index < sequence.length - 1 ? sequence[index + 1] : null
  }

  return {
    root: rootId != null ? (byIdMap.get(rootId) ?? null) : null,
    byId: byIdMap,
    children,
    parents,
    breadcrumb,
    itemsUnder,
    containing,
    walk,
    previous,
    next,
  }
}

/**
 * A collection tree rooted at a purpose marker, over a flat
 * `collections.json`-shaped array: `{ id, parent_id, display_order, type,
 * purpose, items }`. `purpose` finds the root by its `purpose` field (the
 * anchor the importer keys the tree from, e.g. `"exhibitions-root"`);
 * `rootId` takes an id directly, for the sites that resolve a marker's
 * single child as the real root themselves (islamicart's Artistic
 * Introduction). Exactly one of the two is expected. `childType` filters
 * every level's children to one `type` (sharinghistory's themes, sitting
 * next to National Context collections that are not themes). Pure — no
 * reactivity, so it is also what a Node script or a one-off script can call
 * directly.
 */
export function buildCollectionTree(collections, { purpose, rootId, childType, order = 'display_order' } = {}) {
  const nodes = collections ?? []
  const resolvedRootId = rootId ?? nodes.find((node) => node.purpose === purpose)?.id ?? null
  return buildIndex(nodes, resolvedRootId, { childType, order, itemIdsOf: itemIdsOfCollection })
}

// A sentinel no real record's id collides with: `themes.json` is already the
// whole tree, an ordered array of top-level themes with `sub_themes[]`
// nested inside each — there is no marker record to key a root on. Flatten
// it to the same `{ id, parent_id }` shape `buildIndex` reads, with every
// top-level theme's synthetic parent set to this sentinel, and `root` comes
// back null: there genuinely isn't one, and no site has read it from
// `themes.json` before this.
const THEMES_ROOT = Symbol('collectionTree.themesRoot')

function flattenThemes(themes, parentId) {
  const out = []
  for (const theme of themes ?? []) {
    const { sub_themes: subThemes, ...rest } = theme
    out.push({ ...rest, parent_id: parentId })
    out.push(...flattenThemes(subThemes, theme.id))
  }
  return out
}

/**
 * The same interface as `buildCollectionTree`, from a `themes.json` shape
 * (top-level themes, each with `sub_themes[]` and `pictures[]`) instead of a
 * flat, `parent_id`-linked `collections.json`. `root` is always null — see
 * above; `walk`/`children`/… all work the same from the (nulled) top.
 */
export function collectionTreeFromThemes(themes, { childType, order = 'display_order' } = {}) {
  const nodes = flattenThemes(themes, THEMES_ROOT)
  return buildIndex(nodes, THEMES_ROOT, { childType, order, itemIdsOf: itemIdsOfTheme })
}

/**
 * The reactive form: `useCollectionTree({ purpose | rootId, childType?,
 * entity = 'collections', order = 'display_order' })` for the
 * `collections.json` shape, or `useCollectionTree({ source: 'themes',
 * entity: 'themes' })` for a `themes.json` package, where `purpose`/`rootId`
 * do not apply (see `collectionTreeFromThemes`). Reads `entity` through
 * `entityRef`, so the tree is empty (not an error) before that entity's
 * chunk has arrived, and recomputes once it does — a website loads the
 * entity itself, through `meta.entities` or `loadEntities`, exactly as it
 * does for every other record.
 */
export function useCollectionTree(options = {}) {
  const { entity = 'collections', source = 'collections' } = options
  const records = entityRef(entity)
  const tree = computed(() => {
    const nodes = records.value ?? []
    return source === 'themes' ? collectionTreeFromThemes(nodes, options) : buildCollectionTree(nodes, options)
  })
  return {
    root: computed(() => tree.value.root),
    byId: computed(() => tree.value.byId),
    children: (id) => tree.value.children(id),
    parents: (id) => tree.value.parents(id),
    breadcrumb: (id) => tree.value.breadcrumb(id),
    itemsUnder: (id) => tree.value.itemsUnder(id),
    containing: (itemId) => tree.value.containing(itemId),
    walk: () => tree.value.walk(),
    previous: (id) => tree.value.previous(id),
    next: (id) => tree.value.next(id),
  }
}
