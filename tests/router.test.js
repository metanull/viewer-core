import { describe, expect, it } from 'vitest'
import { createViewerRouter, defaultScrollBehavior } from '../src/router/index.js'

describe('createViewerRouter', () => {
  it('always registers Home and the not-found catch-all', () => {
    const router = createViewerRouter({})
    expect(router.getRoutes().map((r) => r.name)).toEqual(['home', 'not-found'])
  })

  it('registers list and detail routes only for configured entities', () => {
    const router = createViewerRouter({ features: { entities: ['things'] } })
    const names = router.getRoutes().map((r) => r.name)
    expect(names).toContain('things-list')
    expect(names).toContain('things-detail')
    expect(names).not.toContain('others-list')
  })

  it('registers extraViews', () => {
    const About = { template: '<p>About</p>' }
    const router = createViewerRouter({
      extraViews: [{ path: '/about', name: 'about', component: About }],
    })
    expect(router.getRoutes().map((r) => r.name)).toContain('about')
  })

  it('lets a website keep its own not-found handling', () => {
    const router = createViewerRouter({ notFound: false })
    expect(router.getRoutes().map((r) => r.name)).not.toContain('not-found')
  })
})

describe('the catch-all', () => {
  it('lands an unknown URL on the not-found route', async () => {
    const router = createViewerRouter({})
    await router.push('/no/such/page')
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})

describe('legacy routes', () => {
  const Thing = { template: '<p>Thing</p>' }
  const config = {
    extraViews: [{ path: '/thing/:id', name: 'thing', component: Thing }],
    legacyRoutes: [
      {
        path: '/database-item/:uid(.*)/:language',
        resolve: async ({ uid }) => (uid === 'mwnf3/objects/1' ? { name: 'thing', params: { id: '1' } } : null),
      },
    ],
  }

  it('redirects a legacy shape to the canonical route, dropping the language segment', async () => {
    const router = createViewerRouter(config)
    await router.push('/database-item/mwnf3/objects/1/fr')
    expect(router.currentRoute.value.name).toBe('thing')
    expect(router.currentRoute.value.path).toBe('/thing/1')
  })

  it('lands on the not-found page when nothing resolves', async () => {
    const router = createViewerRouter(config)
    await router.push('/database-item/mwnf3/objects/99/fr')
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})

describe('entity preloading', () => {
  it('loads the entities a route declares before entering it', async () => {
    let seen = null
    const View = {
      setup() {
        seen = 'mounted'
      },
      template: '<p>View</p>',
    }
    const router = createViewerRouter({
      extraViews: [{ path: '/places', name: 'places', component: View, meta: { entities: ['places'] } }],
    })
    await router.push('/places')
    const { useEntities } = await import('../src/composables/useEntities.js')
    expect(useEntities(['places']).places.value).toHaveLength(2)
    expect(seen).toBeNull() // no app mounted here: only the guard ran
  })
})

describe('defaultScrollBehavior', () => {
  const list = { name: 'list', params: {}, hash: '' }

  it('restores the position when the visitor comes back through history', () => {
    expect(defaultScrollBehavior({ ...list }, { name: 'home', params: {} }, { top: 300 })).toEqual({ top: 300 })
  })

  it('goes to the anchor the URL names', () => {
    expect(defaultScrollBehavior({ ...list, hash: '#section' }, { name: 'home', params: {} }, null)).toEqual({
      el: '#section',
      behavior: 'smooth',
    })
  })

  it('stays put when only the query of the same page changed', () => {
    expect(defaultScrollBehavior({ ...list }, { ...list }, null)).toBe(false)
  })

  it('goes to the top when the page changes', () => {
    expect(defaultScrollBehavior({ ...list }, { name: 'home', params: {} }, null)).toEqual({ top: 0 })
    expect(
      defaultScrollBehavior({ name: 'thing', params: { id: '2' } }, { name: 'thing', params: { id: '1' } }, null),
    ).toEqual({ top: 0 })
  })
})
