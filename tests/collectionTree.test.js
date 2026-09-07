import { beforeAll, describe, expect, it } from 'vitest'
import { buildCollectionTree, collectionTreeFromThemes, loadEntities, useCollectionTree } from '../src/index.js'

// The fixture tree (tests/fixtures/data-package/collections.json), rooted at
// purpose "test-tree-root":
//
//   root1
//   ├─ theme-a (order 1)
//   │  ├─ page-a1 (order 1, item o1)
//   │  ├─ page-a2 (order 2, item o2)
//   │  └─ page-a3 (unordered → sorts last)
//   ├─ theme-b (order 2, item o4)
//   │  └─ page-b1 (order 1, item o3)
//   └─ extra-a (order 3, type "collection" — not a theme)

describe('buildCollectionTree', () => {
  let collections
  beforeAll(async () => {
    ;[collections] = await loadEntities(['collections'])
  })

  it('finds the root by purpose and lists its children in display order', () => {
    const tree = buildCollectionTree(collections, { purpose: 'test-tree-root' })
    expect(tree.root.id).toBe('root1')
    expect(tree.children('root1').map((n) => n.id)).toEqual(['theme-a', 'theme-b', 'extra-a'])
  })

  it('takes an explicit rootId instead of a purpose', () => {
    const tree = buildCollectionTree(collections, { rootId: 'theme-a' })
    expect(tree.root.id).toBe('theme-a')
    expect(tree.children('theme-a').map((n) => n.id)).toEqual(['page-a1', 'page-a2', 'page-a3'])
  })

  it('is an empty, root-less tree when the purpose has no marker', () => {
    const tree = buildCollectionTree(collections, { purpose: 'no-such-purpose' })
    expect(tree.root).toBeNull()
    expect(tree.walk()).toEqual([])
    expect(tree.previous('page-a1')).toBeNull()
  })

  it('sorts a record with no display_order after every ordered sibling', () => {
    const tree = buildCollectionTree(collections, { purpose: 'test-tree-root' })
    expect(tree.children('theme-a').map((n) => n.id)).toEqual(['page-a1', 'page-a2', 'page-a3'])
  })

  describe('childType', () => {
    it('holds every level to the named type, not only the root’s children', () => {
      const tree = buildCollectionTree(collections, { purpose: 'test-tree-root', childType: 'theme' })
      expect(tree.children('root1').map((n) => n.id)).toEqual(['theme-a', 'theme-b'])
    })
  })

  // The second fixture tree (root2, purpose "test-tree-root-2"), rooted
  // where a single type at every depth would drop a real level — the case
  // sharinghistory hits (themes, then chapters):
  //
  //   root2
  //   ├─ theme-x (order 1, type "theme")
  //   │  ├─ chapter-x1 (order 1, type "subtheme", item p1)
  //   │  └─ page-x1 (order 2, type "page" — not a chapter)
  //   └─ context-x (order 2, type "national-context" — not a theme)
  describe('childType as an array, indexed by depth below the root', () => {
    it('filters each depth to its own type', () => {
      const tree = buildCollectionTree(collections, {
        purpose: 'test-tree-root-2',
        childType: ['theme', 'subtheme'],
      })
      expect(tree.children('root2').map((n) => n.id)).toEqual(['theme-x'])
      expect(tree.children('theme-x').map((n) => n.id)).toEqual(['chapter-x1'])
    })

    it('leaves a depth past the end of the array unfiltered', () => {
      const tree = buildCollectionTree(collections, { purpose: 'test-tree-root-2', childType: ['theme'] })
      expect(tree.children('root2').map((n) => n.id)).toEqual(['theme-x'])
      expect(tree.children('theme-x').map((n) => n.id)).toEqual(['chapter-x1', 'page-x1'])
    })
  })

  describe('childType as a function', () => {
    it('is called with the node, its depth below the root, and its parent', () => {
      const calls = []
      const tree = buildCollectionTree(collections, {
        purpose: 'test-tree-root-2',
        childType: (node, depth, parent) => {
          calls.push({ id: node.id, depth, parentId: parent?.id ?? null })
          return depth === 1 ? node.type === 'theme' : node.type === 'subtheme'
        },
      })
      expect(tree.children('root2').map((n) => n.id)).toEqual(['theme-x'])
      expect(tree.children('theme-x').map((n) => n.id)).toEqual(['chapter-x1'])
      expect(calls).toContainEqual({ id: 'theme-x', depth: 1, parentId: 'root2' })
      expect(calls).toContainEqual({ id: 'context-x', depth: 1, parentId: 'root2' })
      expect(calls).toContainEqual({ id: 'chapter-x1', depth: 2, parentId: 'theme-x' })
      expect(calls).toContainEqual({ id: 'page-x1', depth: 2, parentId: 'theme-x' })
    })
  })

  describe('parents / breadcrumb', () => {
    it('gives the ancestor chain root-first, and the same chain plus the node for breadcrumb', () => {
      const tree = buildCollectionTree(collections, { purpose: 'test-tree-root' })
      expect(tree.parents('page-a2').map((n) => n.id)).toEqual(['root1', 'theme-a'])
      expect(tree.breadcrumb('page-a2').map((n) => n.id)).toEqual(['root1', 'theme-a', 'page-a2'])
      expect(tree.parents('root1')).toEqual([])
      expect(tree.breadcrumb('nope')).toEqual([])
    })
  })

  describe('itemsUnder', () => {
    it('collects a node’s own items and its descendants’, depth-first, once each', () => {
      const tree = buildCollectionTree(collections, { purpose: 'test-tree-root' })
      expect(tree.itemsUnder('theme-a')).toEqual(['o1', 'o2'])
      // theme-b carries its own item (o4) as well as its page's (o3).
      expect(tree.itemsUnder('theme-b')).toEqual(['o4', 'o3'])
      expect(tree.itemsUnder('root1')).toEqual(['o1', 'o2', 'o4', 'o3'])
      expect(tree.itemsUnder('missing')).toEqual([])
    })
  })

  describe('containing', () => {
    it('answers the collections an item is directly attached to, not the ones that merely contain it under a child', () => {
      const tree = buildCollectionTree(collections, { purpose: 'test-tree-root' })
      expect(tree.containing('o1').map((n) => n.id)).toEqual(['page-a1'])
      // o3 sits on page-b1, not on theme-b, even though itemsUnder('theme-b') reaches it.
      expect(tree.containing('o3').map((n) => n.id)).toEqual(['page-b1'])
      expect(tree.containing('o4').map((n) => n.id)).toEqual(['theme-b'])
      expect(tree.containing('nope')).toEqual([])
    })
  })

  describe('walk / previous / next', () => {
    it('flattens the tree depth-first, root excluded', () => {
      const tree = buildCollectionTree(collections, { purpose: 'test-tree-root' })
      expect(tree.walk().map((n) => n.id)).toEqual([
        'theme-a', 'page-a1', 'page-a2', 'page-a3', 'theme-b', 'page-b1', 'extra-a',
      ])
    })

    it('crosses a theme boundary: the last page of one theme leads straight to the next node in the flattened order', () => {
      const tree = buildCollectionTree(collections, { purpose: 'test-tree-root' })
      expect(tree.next('page-a3').id).toBe('theme-b')
      expect(tree.next('theme-b').id).toBe('page-b1')
      expect(tree.previous('theme-b').id).toBe('page-a3')
    })

    it('is null at both ends, and for an id the walk does not carry', () => {
      const tree = buildCollectionTree(collections, { purpose: 'test-tree-root' })
      expect(tree.previous('theme-a')).toBeNull()
      expect(tree.next('extra-a')).toBeNull()
      expect(tree.previous('nope')).toBeNull()
      expect(tree.next('nope')).toBeNull()
    })
  })
})

describe('useCollectionTree', () => {
  it('is empty before the entity has loaded, and reactive once it has', async () => {
    const { root, children, walk } = useCollectionTree({ purpose: 'test-tree-root', entity: 'collections' })
    // Other tests in this file may already have loaded 'collections'; what
    // matters is that the composable never reads it eagerly itself, and
    // reflects whatever entityRef state exists once awaited.
    await loadEntities(['collections'])
    expect(root.value.id).toBe('root1')
    expect(children('root1').map((n) => n.id)).toEqual(['theme-a', 'theme-b', 'extra-a'])
    expect(walk()).toHaveLength(7)
  })

  it('resolves by rootId and exposes byId', async () => {
    await loadEntities(['collections'])
    const { root, byId } = useCollectionTree({ rootId: 'theme-a', entity: 'collections' })
    expect(root.value.id).toBe('theme-a')
    expect(byId.value.get('page-a1').internal_name).toBe('Page A1')
  })
})

describe('collectionTreeFromThemes', () => {
  // The DXA shape: an ordered array of top-level themes, each with
  // `sub_themes[]` nested inside and its content in `pictures[]` — no
  // marker record, no `parent_id`, no separate root.
  const themes = [
    {
      id: 'theme-1',
      display_order: 1,
      pictures: [{ picture_item_id: 'p1' }, { picture_item_id: 'p2' }],
      sub_themes: [
        { id: 'sub-1a', display_order: 1, pictures: [{ picture_item_id: 'p3' }] },
        { id: 'sub-1b', display_order: 2, pictures: [] },
      ],
    },
    {
      id: 'theme-2',
      display_order: 2,
      pictures: [{ picture_item_id: 'p4' }],
      sub_themes: [],
    },
  ]

  it('has no root record of its own, but the same walk over the flattened tree', () => {
    const tree = collectionTreeFromThemes(themes)
    expect(tree.root).toBeNull()
    expect(tree.walk().map((n) => n.id)).toEqual(['theme-1', 'sub-1a', 'sub-1b', 'theme-2'])
  })

  it('reads a theme’s content from pictures[].picture_item_id, not items[]', () => {
    const tree = collectionTreeFromThemes(themes)
    expect(tree.itemsUnder('theme-1')).toEqual(['p1', 'p2', 'p3'])
    expect(tree.containing('p1').map((n) => n.id)).toEqual(['theme-1'])
  })

  it('crosses the top-level boundary between two themes exactly as it does between two collections', () => {
    const tree = collectionTreeFromThemes(themes)
    expect(tree.next('sub-1b').id).toBe('theme-2')
    expect(tree.previous('theme-2').id).toBe('sub-1b')
    expect(tree.next('theme-2')).toBeNull()
  })
})
