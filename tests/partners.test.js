import { describe, expect, it } from 'vitest'
import { groupByCountry, partnerHierarchy } from '../src/index.js'

const countryLabels = { 'country-fr': 'France', 'country-de': 'Germany' }
const label = (country) => countryLabels[country] ?? 'Other'

const partners = [
  { id: 'partner-fr-owner', country_id: 'country-fr', level: 'partner', parent_id: null },
  { id: 'partner-fr-assoc-1', country_id: 'country-fr', level: 'associated_partner', parent_id: 'partner-fr-owner' },
  { id: 'partner-fr-assoc-2', country_id: 'country-fr', level: 'associated_partner', parent_id: 'partner-fr-owner' },
  { id: 'partner-de-plain', country_id: 'country-de', parent_id: null },
]

describe('groupByCountry', () => {
  it('puts every record in main when no tier is named', () => {
    const rows = groupByCountry(partners, { label })
    expect(rows.map((r) => r.country)).toEqual(['country-fr', 'country-de'])
    expect(rows[0].main.map((p) => p.id)).toEqual(['partner-fr-owner', 'partner-fr-assoc-1', 'partner-fr-assoc-2'])
    expect(rows[0].associated).toEqual([])
    expect(rows[1].main.map((p) => p.id)).toEqual(['partner-de-plain'])
  })

  it('splits main and associated on the named tier field, by the value "partner"', () => {
    const rows = groupByCountry(partners, { label, tier: 'level' })
    const france = rows.find((r) => r.country === 'country-fr')
    expect(france.main.map((p) => p.id)).toEqual(['partner-fr-owner'])
    expect(france.associated.map((p) => p.id)).toEqual(['partner-fr-assoc-1', 'partner-fr-assoc-2'])
    // A partner with no tier field (null or undefined) is treated as main,
    // not associated, because exporters emit level: null for partners without
    // curated hierarchy.
    const germany = rows.find((r) => r.country === 'country-de')
    expect(germany.main.map((p) => p.id)).toEqual(['partner-de-plain'])
    expect(germany.associated).toEqual([])
  })

  it('sorts groups by label, ascending by default and descending on request', () => {
    const asc = groupByCountry(partners, { label })
    expect(asc.map((r) => r.label)).toEqual(['France', 'Germany'])
    const desc = groupByCountry(partners, { label, order: 'desc' })
    expect(desc.map((r) => r.label)).toEqual(['Germany', 'France'])
  })

  it('groups partners with no country under one null group', () => {
    const rows = groupByCountry([...partners, { id: 'no-country' }], { label })
    const other = rows.find((r) => r.country == null)
    expect(other.main.map((p) => p.id)).toEqual(['no-country'])
  })
})

describe('partnerHierarchy', () => {
  it('finds an owner\'s associated partners by parent_id', () => {
    const { children } = partnerHierarchy(partners)
    expect(children('partner-fr-owner').map((p) => p.id)).toEqual(['partner-fr-assoc-1', 'partner-fr-assoc-2'])
    expect(children('partner-de-plain')).toEqual([])
  })

  it('answers a partner\'s parent, or null for one with none', () => {
    const { parentOf } = partnerHierarchy(partners)
    expect(parentOf('partner-fr-assoc-1')?.id).toBe('partner-fr-owner')
    expect(parentOf('partner-fr-owner')).toBeNull()
    expect(parentOf('partner-de-plain')).toBeNull()
  })

  it('lists every partner with no parent, or a parent_id outside the list, as a root', () => {
    const { roots } = partnerHierarchy([...partners, { id: 'orphan', parent_id: 'not-in-list' }])
    expect(roots.map((p) => p.id)).toEqual(['partner-fr-owner', 'partner-de-plain', 'orphan'])
  })
})
