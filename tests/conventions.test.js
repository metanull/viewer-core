import { beforeAll, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  PROJECT_ENTRIES, PROJECT_FAMILIES, createI18n, loadEntities, mwnfLinks, projectFamily, projectName,
  sectionMeta, useFeaturedRecord, useProjectName, useSection,
} from '../src/index.js'

describe('projectName', () => {
  const t = (key) => (key === 'core.project.islamicArt' ? 'Discover Islamic Art' : key)

  it('names a project by its legacy key through the texts, and reads an unknown key as itself', () => {
    expect(projectName('ISL', t)).toBe('Discover Islamic Art')
    expect(projectName('ZZZ', t)).toBe('ZZZ')
    expect(projectName(undefined, t)).toBe('')
  })

  it('asks for one entry per project of the legacy table, both spellings of Sharing History included', () => {
    expect(PROJECT_ENTRIES.AWE).toBe(PROJECT_ENTRIES.awe)
    expect(new Set(Object.values(PROJECT_ENTRIES)).size).toBe(8)
  })

  it('binds to the installed texts inside a component', () => {
    const i18n = createI18n({ messages: { en: { 'core.project.carpetArt': 'Discover Carpet Art' } } })
    let name
    mount({ setup() { name = useProjectName(); return () => null } }, { global: { plugins: [i18n] } })
    expect(name('DCA')).toBe('Discover Carpet Art')
  })
})

describe('projectFamily', () => {
  it('answers a project\'s colour family by its legacy key, and the key itself when unknown', () => {
    expect(projectFamily('ISL')).toBe('ISLandEPM')
    expect(projectFamily('EPM')).toBe('ISLandEPM')
    expect(projectFamily('DBA')).toBe('DBA')
    expect(projectFamily('ZZZ')).toBe('ZZZ')
    expect(projectFamily(undefined)).toBe('')
  })

  it('has one entry per key of PROJECT_ENTRIES, both spellings of Sharing History included', () => {
    expect(Object.keys(PROJECT_FAMILIES).sort()).toEqual(Object.keys(PROJECT_ENTRIES).sort())
    expect(PROJECT_FAMILIES.AWE).toBe(PROJECT_FAMILIES.awe)
  })
})

describe('sectionMeta', () => {
  it('merges the chrome entities into every section, on top of the section\'s own', () => {
    const meta = sectionMeta(['gallery', 'items', 'partners', 'countries'])
    expect(meta('collection', 'tags')).toEqual({
      section: 'collection',
      entities: ['gallery', 'items', 'partners', 'countries', 'tags'],
    })
    expect(meta('home')).toEqual({ section: 'home', entities: ['gallery', 'items', 'partners', 'countries'] })
  })

  it('carries no chrome at all when none is named', () => {
    const meta = sectionMeta()
    expect(meta('database', 'languages')).toEqual({ section: 'database', entities: ['languages'] })
  })
})

describe('mwnfLinks', () => {
  it('is frozen, and carries the twelve addresses the DXA configs repeat', () => {
    expect(Object.isFrozen(mwnfLinks)).toBe(true)
    expect(mwnfLinks.portal).toBe('https://www.museumwnf.org')
    expect(mwnfLinks.islamicArt).toBe('https://islamicart.museumwnf.org')
    expect(Object.keys(mwnfLinks)).toHaveLength(12)
  })
})

describe('useSection', () => {
  it('reads the section a route declares, and nothing for one that does not', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: { template: '<p />' } },
        { path: '/collection', name: 'collection', component: { template: '<p />' }, meta: { section: 'collection' } },
      ],
    })
    let section
    mount({ setup() { section = useSection(); return () => null } }, { global: { plugins: [router] } })
    expect(section.value).toBe('')
    await router.push('/collection')
    expect(section.value).toBe('collection')
  })
})

describe('useFeaturedRecord', () => {
  beforeAll(() => loadEntities(['objects']))

  it('picks among the records with an image, deterministically under a seed', () => {
    const first = useFeaturedRecord('objects', { seed: 7 })
    const again = useFeaturedRecord('objects', { seed: 7 })
    expect(first.value.images.length).toBeGreaterThan(0)
    expect(first.value.id).toBe(again.value.id)
    expect(['o1', 'o3', 'o4']).toContain(first.value.id)
  })

  it('picks among all when asked, and answers null for an entity not yet loaded', () => {
    const any = useFeaturedRecord('objects', { withImage: false, seed: 3 })
    expect(['o1', 'o2', 'o3', 'o4']).toContain(any.value.id)
    expect(useFeaturedRecord('places', { seed: 1 }).value).toBeNull()
  })
})
