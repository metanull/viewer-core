import { describe, expect, it } from 'vitest'
import { byId, entityRef, loadEntities, useEntities } from '../src/index.js'

describe('entityRef', () => {
  it('hands out the shared ref without loading anything', async () => {
    const before = entityRef('places')
    expect(before.value).toBeNull()
    expect(before).toBe(useEntities(['places']).places)
    await loadEntities(['places'])
    expect(before.value).toHaveLength(2)
  })
})

describe('useEntities', () => {
  it('hands out one shared ref per entity, null until the chunk arrives', async () => {
    const first = useEntities(['things'])
    const second = useEntities(['things', 'places'])
    expect(first.things).toBe(second.things)
    await first.ready
    expect(first.things.value).toHaveLength(3)
    await second.ready
    expect(second.loaded.value).toBe(true)
    expect(second.places.value.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('accepts one name as well as a list', async () => {
    const { things, ready } = useEntities('things')
    await ready
    expect(things.value[0].id).toBe('1')
  })

  it('rejects an entity the package does not have', async () => {
    await expect(useEntities(['nope']).ready).rejects.toThrow('Unknown entity')
    await expect(loadEntities(['nope'])).rejects.toThrow('Unknown entity')
  })

  it('indexes an entity by its id, once', async () => {
    await loadEntities(['things'])
    const index = byId('things')
    expect(index).toBe(byId('things'))
    expect(index.value.get('2').title).toBe('Second Thing')
    expect(useEntities(['things']).byId('things')).toBe(index)
  })

  it('indexes on another key on request', async () => {
    await loadEntities(['things'])
    expect(byId('things', 'title').value.get('First Thing').id).toBe('1')
  })
})
