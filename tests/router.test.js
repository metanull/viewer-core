import { describe, expect, it } from 'vitest'
import { createViewerRouter } from '../src/router/index.js'

describe('createViewerRouter', () => {
  it('always registers Home', () => {
    const router = createViewerRouter({})
    expect(router.getRoutes().map((r) => r.name)).toEqual(['home'])
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
})
