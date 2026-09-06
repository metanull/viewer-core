import { beforeAll, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { PROJECT_ENTRIES, createI18n, loadEntities, projectName, useFeaturedRecord, useProjectName, useSection } from '../src/index.js'

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
