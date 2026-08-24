import { describe, expect, it } from 'vitest'
import { useDataPackage } from '../src/index.js'

describe('useDataPackage', () => {
  it('exposes the manifest and language list', () => {
    const { manifest, languages } = useDataPackage()
    expect(manifest.dataset).toBe('fixture')
    expect(languages).toEqual(['en', 'fr'])
  })

  it('lists entities without the manifest or npm metadata', () => {
    const { entityNames } = useDataPackage()
    // The fixture directory contains package.json, like every installed
    // npm package — it must not surface as an entity.
    expect(entityNames).toEqual(['things'])
  })

  it('lazy-loads entity records', async () => {
    const { loadEntity } = useDataPackage()
    const things = await loadEntity('things')
    expect(things).toHaveLength(3)
    expect(things[0].id).toBe('1')
  })

  it('rejects unknown entities', async () => {
    const { loadEntity } = useDataPackage()
    await expect(loadEntity('nope')).rejects.toThrow('Unknown entity')
  })
})
