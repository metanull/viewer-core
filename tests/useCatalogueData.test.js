import { beforeAll, describe, expect, it } from 'vitest'
import { loadEntities, useCatalogueData, useDataPackage } from '../src/index.js'

// The wrapper half of a site's data composable, over the same fixture the
// other suites read. Loaded once for the whole file — these tests read the
// package, they do not reset it between each other.
beforeAll(() => loadEntities(['objects', 'places', 'glossary']))

describe('tr', () => {
  it('falls back to defaultLanguage, then to {}, the way a site’s own tr did', async () => {
    const { tr, loadEnglish } = useCatalogueData({ eager: ['objects'] })
    await loadEnglish()
    expect(tr('objects', 'o1').name).toBe('Glazed *bowl*')
    // o2 has no French translation file entry for this id in the fixture —
    // reading it in a language that was never loaded still falls back.
    expect(tr('objects', 'o2', 'de')).toEqual({ name: 'Mosque lamp', description: 'A glass lamp with an inscription.', type: 'Glass', location: 'Damascus' })
    expect(tr('objects', 'nope')).toEqual({})
  })
})

describe('labelOf', () => {
  it('reads the translated name, stripped of markdown, when one exists', async () => {
    const { labelOf, loadEnglish } = useCatalogueData({ eager: ['objects'] })
    await loadEnglish()
    expect(labelOf('objects', 'o1')).toBe('Glazed bowl')
  })

  it('falls back to the named record field when there is no translation', () => {
    // places carries no translations/places.*.json file at all in the fixture.
    const { labelOf } = useCatalogueData({})
    expect(labelOf('places', 'p2', { fallback: 'name' })).toBe('Elsewhere')
  })

  it('falls back to the id itself when neither the translation nor the field is there', () => {
    const { labelOf } = useCatalogueData({})
    // places.json has no `internal_name` field — the default fallback.
    expect(labelOf('places', 'p1')).toBe('p1')
    expect(labelOf('objects', 'unknown-id')).toBe('unknown-id')
  })

  it('reads a missing id as "", the way a missing record does everywhere else', () => {
    const { labelOf } = useCatalogueData({})
    expect(labelOf('objects', null)).toBe('')
    expect(labelOf('objects', undefined)).toBe('')
  })
})

describe('md / mdInline bound to the glossary', () => {
  beforeAll(async () => {
    const { loadTranslations } = useDataPackage()
    await loadTranslations('glossary', 'en')
  })

  it('marks a term from the site’s own glossary without the caller passing one', () => {
    const { md, mdInline } = useCatalogueData({})
    expect(md('A kufic bowl.')).toContain('<span class="gloss-term" data-gid="g1">kufic</span>')
    expect(mdInline('A kufic bowl.')).toContain('<span class="gloss-term" data-gid="g1">kufic</span>')
  })

  it('lets a caller pass its own glossary instead — a record’s own terms, not the whole package', () => {
    const { md } = useCatalogueData({})
    const own = [{ id: 'g2', spelling: 'glaze' }]
    const html = md('A kufic bowl with a fine glaze.', { glossary: own })
    expect(html).not.toContain('data-gid="g1"')
    expect(html).toContain('data-gid="g2"')
  })

  it('does not bind a default when glossary: false, but still honours an explicit one', () => {
    const { md } = useCatalogueData({ glossary: false })
    expect(md('A kufic bowl.')).not.toContain('gloss-term')
    const own = [{ id: 'g1', spelling: 'kufic' }]
    expect(md('A kufic bowl.', { glossary: own })).toContain('data-gid="g1"')
  })

  it('mdStrip has nothing to bind and behaves as the plain-text renderer', () => {
    const { mdStrip } = useCatalogueData({})
    expect(mdStrip('A *kufic* bowl.')).toBe('A kufic bowl.')
  })
})

describe('entity / index — visible[name]', () => {
  it('is the whole list, unfiltered, with no predicate declared', () => {
    const { entity } = useCatalogueData({})
    expect(entity('objects').value.map((o) => o.id).sort()).toEqual(['o1', 'o2', 'o3', 'o4'])
  })

  it('narrows to visible[name] when one is declared, for both entity() and index()', () => {
    const { entity, index } = useCatalogueData({
      visible: { objects: (o) => o.country_id === 'c-eg' },
    })
    expect(entity('objects').value.map((o) => o.id).sort()).toEqual(['o1', 'o3'])
    expect([...index('objects').value.keys()].sort()).toEqual(['o1', 'o3'])
    expect(index('objects').value.get('o2')).toBeUndefined()
  })

  it('is null, not an empty list, before the entity has loaded', () => {
    const { entity, index } = useCatalogueData({})
    expect(entity('timelines').value).toBeNull()
    expect(index('timelines').value.size).toBe(0)
  })

  it('hands out the same ref on repeated calls, the way byId does', () => {
    const catalogue = useCatalogueData({})
    expect(catalogue.entity('objects')).toBe(catalogue.entity('objects'))
    expect(catalogue.index('objects')).toBe(catalogue.index('objects'))
    // A fresh instance does not share the first one's cache.
    expect(useCatalogueData({}).entity('objects')).not.toBe(catalogue.entity('objects'))
  })
})

describe('loadEnglish', () => {
  it('is memoised: the same promise for every call on one instance', () => {
    const { loadEnglish } = useCatalogueData({ eager: ['places'] })
    expect(loadEnglish()).toBe(loadEnglish())
  })

  it('loads defaultLanguage for every entity named in eager, and only those', async () => {
    const { loadEnglish, translations } = useCatalogueData({ eager: ['places'], defaultLanguage: 'fr' })
    expect(translations('places', 'fr')).toEqual({})
    await loadEnglish()
    // places has no translations/places.fr.json in the fixture — the load
    // still resolves, to {}, rather than rejecting.
    expect(translations('places', 'fr')).toEqual({})
  })

  it('defaults eager to every entity the package has, when none is named', async () => {
    const { loadEnglish, translations } = useCatalogueData({})
    await loadEnglish()
    expect(translations('things', 'en')).toEqual({
      1: { title: 'First Thing (EN)' },
      2: { title: 'Second Thing (EN)' },
    })
  })
})

describe('package re-exports', () => {
  it('availableLanguages, loadTranslations and translations behave as the package’s own', async () => {
    const catalogue = useCatalogueData({})
    expect(catalogue.availableLanguages('things')).toEqual(['en', 'fr'])
    await catalogue.loadTranslations('things', 'en')
    expect(catalogue.translations('things', 'en')['1'].title).toBe('First Thing (EN)')
  })
})
