import { beforeAll, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import {
  combineExpansions, countryExpansion, glossaryExpansion, loadEntities, parseBooleanQuery, useDataPackage, useKeywordIndex,
} from '../src/index.js'

const ids = (list) => list.map((r) => r.id)

beforeAll(async () => {
  await loadEntities(['objects', 'countries', 'glossary'])
  const { loadTranslations } = useDataPackage()
  await loadTranslations('objects', 'en')
  await loadTranslations('objects', 'fr')
  await loadTranslations('countries', 'en')
  await loadTranslations('countries', 'fr')
  await loadTranslations('glossary', 'en')
  await loadTranslations('glossary', 'fr')
})

describe('the field grammar', () => {
  const index = () =>
    useKeywordIndex('objects', {
      grammar: 'fields',
      fields: {
        keyword: (record, text) => [text.name, text.description, record.internal_name],
        name: (record, text) => text.name,
        location: (record, text) => text.location,
        material: (record, text) => text.type,
      },
    })

  it('matches everything with no keyword, a field with one', () => {
    const { search } = index()
    expect(search([])).toHaveLength(4)
    expect(ids(search([{ field: 'name', keyword: 'lamp' }]))).toEqual(['o2'])
  })

  it('reads Markdown as plain text and ignores case', () => {
    // The name is "Glazed *bowl*": the emphasis marks are not searched for.
    expect(ids(useKeywordIndex('objects', { grammar: 'fields', fields: { name: (r, t) => t.name } }).search([{ field: 'name', keyword: 'BOWL' }]))).toEqual(['o1'])
  })

  it('folds the rows with AND and OR in order', () => {
    const { search } = index()
    expect(ids(search([{ field: 'material', keyword: 'ceramic' }, { field: 'location', keyword: 'cairo', cond: 'AND' }]))).toEqual(['o1'])
    expect(ids(search([{ field: 'material', keyword: 'glass' }, { field: 'location', keyword: 'cairo', cond: 'OR' }]))).toEqual(['o1', 'o2'])
    expect(search([{ field: 'material', keyword: 'glass' }, { field: 'name', keyword: 'nothing', cond: 'AND' }])).toEqual([])
  })

  it('searches the translation of the language asked for', () => {
    const language = ref('fr')
    const { search } = useKeywordIndex('objects', { grammar: 'fields', fields: { name: (r, t) => t.name }, language })
    expect(ids(search([{ field: 'name', keyword: 'iznik' }]))).toEqual(['o4'])
    expect(ids(search([{ field: 'name', keyword: 'bol' }]))).toEqual(['o1'])
    // o2 has no French row and falls back to English.
    expect(ids(search([{ field: 'name', keyword: 'lamp' }]))).toEqual(['o2'])
  })

  it('refuses a grammar it does not have', () => {
    expect(() => useKeywordIndex('objects', { grammar: 'regex' })).toThrow(/grammar/)
  })
})

describe('rank: hits', () => {
  // o1 matches all three OR'd rows (name, material, location); o3 and o4
  // each match material alone. o2 matches none and drops out.
  const rows = [
    { field: 'name', keyword: 'bowl' },
    { field: 'material', keyword: 'ceramic', cond: 'OR' },
    { field: 'location', keyword: 'cairo', cond: 'OR' },
  ]
  const fields = {
    name: (r, t) => t.name,
    material: (r, t) => t.type,
    location: (r, t) => t.location,
  }

  it('leaves the order alone by default', () => {
    const { search } = useKeywordIndex('objects', { grammar: 'fields', fields })
    expect(ids(search(rows))).toEqual(['o1', 'o3', 'o4'])
  })

  it('orders by hits, then chronologically, undated last', () => {
    const { search } = useKeywordIndex('objects', { grammar: 'fields', fields, rank: 'hits' })
    // o1: 3 hits. o4 (dated 1550) and o3 (undated) both have 1: dated first.
    expect(ids(search(rows))).toEqual(['o1', 'o4', 'o3'])
  })
})

describe('expand', () => {
  it('glossaryExpansion finds a record written with another spelling of the same term', () => {
    const { search } = useKeywordIndex('objects', {
      grammar: 'fields',
      fields: { description: (r, t) => t.description },
      expand: glossaryExpansion(),
    })
    // o1's description contains "kufic script" outright; o3's contains only
    // "kufic" — found because "kufic script" expands to "kufic" (a fellow
    // spelling of glossary entry g1, in English).
    expect(ids(search([{ field: 'description', keyword: 'kufic script' }]))).toEqual(['o1', 'o3'])
  })

  it('without expand, the un-shared spelling misses', () => {
    const { search } = useKeywordIndex('objects', {
      grammar: 'fields',
      fields: { description: (r, t) => t.description },
    })
    expect(ids(search([{ field: 'description', keyword: 'kufic script' }]))).toEqual(['o1'])
  })

  it('countryExpansion finds the records held in a country named by term', () => {
    const { search } = useKeywordIndex('objects', {
      grammar: 'fields',
      fields: { location: (item, t) => [t.location, item.country_id] },
      expand: countryExpansion(),
    })
    // o1 and o3 are both held in c-eg ("Egypt"); o1's location text ("Cairo")
    // never says so, and o3 has no location text at all.
    expect(ids(search([{ field: 'location', keyword: 'Egypt' }]))).toEqual(['o1', 'o3'])
  })

  it('combineExpansions runs both', () => {
    const { search } = useKeywordIndex('objects', {
      grammar: 'fields',
      fields: {
        description: (r, t) => t.description,
        location: (item, t) => [t.location, item.country_id],
      },
      expand: combineExpansions(glossaryExpansion(), countryExpansion()),
    })
    expect(ids(search([{ field: 'description', keyword: 'kufic script' }]))).toEqual(['o1', 'o3'])
    expect(ids(search([{ field: 'location', keyword: 'Egypt' }]))).toEqual(['o1', 'o3'])
  })
})

describe('glossaryExpansion and countryExpansion standalone', () => {
  it('glossaryExpansion(term, language) → the spellings of the matching entry, in that language', () => {
    const expand = glossaryExpansion()
    expect(expand('kufic script', 'en')).toEqual(['kufic', 'kufic script'])
    expect(expand('écriture coufique', 'fr')).toEqual(['coufique', 'écriture coufique'])
    expect(expand('no-such-term', 'en')).toEqual([])
  })

  it('countryExpansion(term, language) → the id of the country named by term', () => {
    const expand = countryExpansion()
    expect(expand('Egypt', 'en')).toEqual(['c-eg'])
    expect(expand('Égypte', 'fr')).toEqual(['c-eg'])
    // French has no name for Syria in the fixture; falls back to English.
    expect(expand('Syria', 'fr')).toEqual(['c-sy'])
    expect(expand('Atlantis', 'en')).toEqual([])
  })
})

describe('the boolean grammar', () => {
  const index = () =>
    useKeywordIndex('objects', {
      grammar: 'boolean',
      haystack: (record, text) => [text.name, text.description, text.type],
    })

  it('parses operators, prefixes and phrases', () => {
    expect(parseBooleanQuery('+glass -lamp shap* "kufic script" ~x')).toEqual([
      { op: '+', text: 'glass', prefix: false, phrase: false },
      { op: '-', text: 'lamp', prefix: false, phrase: false },
      { op: '', text: 'shap', prefix: true, phrase: false },
      { op: '', text: 'kufic script', prefix: false, phrase: true },
      { op: '~', text: 'x', prefix: false, phrase: false },
    ])
  })

  it('requires, excludes and ranks', () => {
    const { search } = index()
    expect(ids(search('+kufic'))).toEqual(['o1', 'o3'])
    expect(ids(search('+kufic -bowl'))).toEqual(['o3'])
    expect(ids(search('+ceramic >bowl'))[0]).toBe('o1')
    expect(search('nothing-here')).toEqual([])
    expect(search('')).toEqual([])
  })

  it('matches a prefix at a word start only', () => {
    const { search } = index()
    expect(ids(search('glaz*'))).toEqual(['o1'])
    expect(search('laz*')).toEqual([])
  })

  it('searches every field of the translation when no haystack is given', () => {
    const { search } = useKeywordIndex('objects', { grammar: 'boolean' })
    expect(ids(search('+damascus'))).toEqual(['o2'])
  })
})
