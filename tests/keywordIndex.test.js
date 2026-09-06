import { beforeAll, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { loadEntities, parseBooleanQuery, useDataPackage, useKeywordIndex } from '../src/index.js'

const ids = (list) => list.map((r) => r.id)

beforeAll(async () => {
  await loadEntities(['objects'])
  const { loadTranslations } = useDataPackage()
  await loadTranslations('objects', 'en')
  await loadTranslations('objects', 'fr')
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
