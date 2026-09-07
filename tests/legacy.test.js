import { describe, expect, it } from 'vitest'
import { itemFromUidPath, partnerFromKey, partnerKey } from '../src/legacy/index.js'

const countries = [
  { id: 'country-ua', code: 'ua' },
  { id: 'country-at', code: 'at' },
]

describe('partnerKey', () => {
  it('reads the DXA shape: mwnf3:museums:<legacyId>:<countryCode>', () => {
    expect(partnerKey({ backward_compatibility: 'mwnf3:museums:Mus21:ua' }))
      .toEqual({ legacyId: 'Mus21', countryCode: 'ua' })
  })

  it('reads the Sharing History shape, whose key has no country segment of its own', () => {
    expect(partnerKey({ backward_compatibility: 'mwnf3_sharing_history:sh_partners:at_01_d' }))
      .toEqual({ legacyId: 'at_01_d', countryCode: 'at' })
  })

  it('falls back to the country list when there is no backward_compatibility at all', () => {
    const partner = { id: 'partner-1', country_id: 'country-at' }
    expect(partnerKey(partner, countries)).toEqual({ legacyId: 'partner-1', countryCode: 'at' })
    expect(partnerKey(partner)).toEqual({ legacyId: 'partner-1', countryCode: '' })
  })
})

describe('partnerFromKey', () => {
  const partners = [
    { id: 'p-dxa', backward_compatibility: 'mwnf3:museums:Mus21:ua' },
    { id: 'p-sh', backward_compatibility: 'mwnf3_sharing_history:sh_partners:at_01_d' },
  ]

  it('finds the partner whose key matches both parts', () => {
    expect(partnerFromKey(partners, countries, 'ua', 'Mus21')?.id).toBe('p-dxa')
    expect(partnerFromKey(partners, countries, 'at', 'at_01_d')?.id).toBe('p-sh')
  })

  it('answers null for a key nothing matches', () => {
    expect(partnerFromKey(partners, countries, 'fr', 'Mus99')).toBeNull()
  })
})

describe('itemFromUidPath', () => {
  const items = [
    { id: 'item-1', backward_compatibility: 'mwnf3:objects:isl:fr:001' },
    { id: 'item-2', backward_compatibility: 'MWNF3_SHARING_HISTORY:sh_objects:AT_02' },
  ]

  it('matches a slash-separated path against backward_compatibility with colons', () => {
    expect(itemFromUidPath(items, 'mwnf3/objects/isl/fr/001')?.id).toBe('item-1')
  })

  it('matches case-insensitively, for Sharing History\'s lowercase keys', () => {
    expect(itemFromUidPath(items, 'mwnf3_sharing_history/sh_objects/at_02')?.id).toBe('item-2')
  })

  it('answers null for a path nothing matches', () => {
    expect(itemFromUidPath(items, 'nope/at/all')).toBeNull()
  })
})
