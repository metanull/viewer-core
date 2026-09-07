import { describe, expect, it } from 'vitest'
import { mountSite, checkRoutes, checkSectionMeta, checkTextsRendered } from '../src/testing/index.js'

const config = {
  datasetPackage: '@metanull/fixture-data',
  siteName: 'Fixture Museum',
  features: { entities: ['things'] },
  messages: {},
  extraViews: [
    { path: '/', name: 'home', meta: { section: 'home', entities: [] } },
    { path: '/things', name: 'things-list', meta: { section: 'catalogue', entities: ['things'] } },
    { path: '/things/:id', name: 'things-detail', meta: { section: 'catalogue', entities: ['things'] } },
  ],
  legacyRoutes: [
    { path: '/old/:id', resolve: async ({ id }) => ({ name: 'things-detail', params: { id } }) },
  ],
}

describe('mountSite', () => {
  it('returns the app, host, and router when mounted', async () => {
    const { app, host, router } = await mountSite(config, {})
    expect(app).toBeDefined()
    expect(host).toBeInstanceOf(HTMLElement)
    expect(router).toBeDefined()
    app.unmount()
  })

  it('appends the host to the document body', async () => {
    const { app, host } = await mountSite(config, {})
    expect(document.body.contains(host)).toBe(true)
    app.unmount()
  })

  it('sets the window location hash before mounting', async () => {
    const hash = '#/things'
    const { app } = await mountSite(config, {}, hash)
    // The router may modify the hash by adding query params like lang=en
    expect(window.location.hash).toContain(hash.substring(1))
    app.unmount()
  })
})

describe('checkRoutes', () => {
  it('returns no problems when all routes are valid', () => {
    const problems = checkRoutes(config)
    expect(problems).toEqual([])
  })

  it('detects routes without names', () => {
    const badConfig = { ...config, extraViews: [{ path: '/', meta: { section: 'home' } }] }
    const problems = checkRoutes(badConfig)
    expect(problems).toContainEqual(expect.stringMatching(/Route.*has no name/))
  })

  it('detects catch-all routes', () => {
    const badConfig = {
      ...config,
      extraViews: [
        ...config.extraViews,
        { path: '/:pathMatch(.*)', name: 'not-found' },
      ],
    }
    const problems = checkRoutes(badConfig)
    expect(problems).toContainEqual(expect.stringMatching(/catch-all/))
  })

  it('detects missing expected route names', () => {
    const problems = checkRoutes(config, { names: ['missing-route'] })
    expect(problems).toContainEqual(expect.stringMatching(/missing-route.*not found/))
  })

  it('detects missing expected legacy paths', () => {
    const problems = checkRoutes(config, { legacyPaths: ['/missing/:path'] })
    expect(problems).toContainEqual(expect.stringMatching(/missing.*not found/))
  })
})

describe('checkSectionMeta', () => {
  it('returns no problems when all routes have section metadata', () => {
    const problems = checkSectionMeta(config)
    expect(problems).toEqual([])
  })

  it('detects routes without section metadata', () => {
    const badConfig = {
      ...config,
      extraViews: [{ path: '/', name: 'home', meta: { entities: [] } }],
    }
    const problems = checkSectionMeta(badConfig)
    expect(problems).toContainEqual(expect.stringMatching(/no section metadata/))
  })

  it('detects routes with empty section metadata', () => {
    const badConfig = {
      ...config,
      extraViews: [{ path: '/', name: 'home', meta: { section: '', entities: [] } }],
    }
    const problems = checkSectionMeta(badConfig)
    expect(problems).toContainEqual(expect.stringMatching(/no section metadata/))
  })
})

describe('checkTextsRendered', () => {
  it('returns empty array by default', async () => {
    const { app, host } = await mountSite(config, {})
    const matches = checkTextsRendered(host)
    expect(matches).toEqual([])
    app.unmount()
  })

  it('matches text keys in the rendered host', async () => {
    const host = document.createElement('div')
    host.textContent = 'Here is a catalogue.field.name and another common.entry'
    const matches = checkTextsRendered(host, { namespaces: ['catalogue', 'common'] })
    expect(matches).toContain('catalogue')
    expect(matches).toContain('common')
  })

  it('returns empty array when no texts match', async () => {
    const host = document.createElement('div')
    host.textContent = 'Plain text with no keys'
    const matches = checkTextsRendered(host, { namespaces: ['catalogue'] })
    expect(matches).toEqual([])
  })
})
