import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { facetOptions, useFacets } from '../src/index.js'

const countries = { 'c-eg': 'Egypt', 'c-sy': 'Syria', 'c-tr': 'Türkiye' }
const tags = {
  't-type-bowl': { category: 'type', label: 'bowl' },
  't-type-lamp': { category: 'type', label: 'lamp' },
  't-mat-ceramic': { category: 'material', label: 'ceramic' },
}
const records = [
  { id: 1, country_id: 'c-sy', dynasty_ids: ['d2', 'd1'], tag_ids: ['t-type-lamp', 't-mat-ceramic'] },
  { id: 2, country_id: 'c-eg', dynasty_ids: ['d1'], tag_ids: ['t-type-bowl'] },
  { id: 3, country_id: 'c-eg', dynasty_ids: [], tag_ids: [] },
  { id: 4, country_id: null, dynasty_ids: ['d1'] },
]
const dynasties = { d1: { name: 'Fatimid', from_ad: 909 }, d2: { name: 'Ayyubid', from_ad: 1171 } }

describe('facetOptions', () => {
  it('offers the values the records carry, labelled and sorted by label', () => {
    const { country } = facetOptions(records, { country: { field: 'country_id', label: (id) => countries[id] } })
    expect(country).toEqual([
      { value: 'c-eg', label: 'Egypt' },
      { value: 'c-sy', label: 'Syria' },
    ])
  })

  it('flattens a field that holds several values, and sorts by a comparator', () => {
    const { dynasty } = facetOptions(records, {
      dynasty: {
        field: 'dynasty_ids',
        label: (id) => dynasties[id].name,
        sort: (a, b) => dynasties[a.value].from_ad - dynasties[b.value].from_ad,
      },
    })
    expect(dynasty.map((o) => o.label)).toEqual(['Fatimid', 'Ayyubid'])
  })

  it('reads through a function, keeps a subset, and upper-cases a tag label on request', () => {
    const { type, material } = facetOptions(records, {
      type: {
        values: (r) => r.tag_ids ?? [],
        include: (id) => tags[id]?.category === 'type',
        label: (id) => tags[id].label,
        capitalize: true,
      },
      material: {
        values: (r) => r.tag_ids ?? [],
        include: (id) => tags[id]?.category === 'material',
        label: (id) => tags[id].label,
      },
    })
    expect(type).toEqual([
      { value: 't-type-bowl', label: 'Bowl' },
      { value: 't-type-lamp', label: 'Lamp' },
    ])
    expect(material).toEqual([{ value: 't-mat-ceramic', label: 'ceramic' }])
  })

  it('keeps the order met with sort: none', () => {
    const { country } = facetOptions(records, { country: { field: 'country_id', label: (id) => countries[id], sort: 'none' } })
    expect(country.map((o) => o.value)).toEqual(['c-sy', 'c-eg'])
  })

  it('offers nothing from nothing', () => {
    expect(facetOptions([], { country: { field: 'country_id' } })).toEqual({ country: [] })
    expect(facetOptions(null, { country: { field: 'country_id' } })).toEqual({ country: [] })
  })
})

describe('useFacets', () => {
  it('follows the records it is handed — all of them or the matching subset', () => {
    const subset = ref(records)
    const facets = useFacets(subset, { country: { field: 'country_id', label: (id) => countries[id] } })
    expect(facets.value.country).toHaveLength(2)
    subset.value = records.filter((r) => r.country_id === 'c-eg')
    expect(facets.value.country).toEqual([{ value: 'c-eg', label: 'Egypt' }])
  })
})
