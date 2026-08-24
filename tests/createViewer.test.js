import { describe, expect, it, vi } from 'vitest'
import { createViewer } from '../src/index.js'

const config = {
  datasetPackage: '@metanull/fixture-data',
  siteName: 'Fixture Museum',
  features: { entities: ['things'] },
}

async function mountViewer() {
  window.location.hash = '#/'
  const app = createViewer(config)
  const host = document.createElement('div')
  app.mount(host)
  const router = app.config.globalProperties.$router
  await router.isReady()
  return { app, host, router }
}

describe('createViewer', () => {
  it('returns a mountable Vue application rendering Home', async () => {
    const { app, host } = await mountViewer()
    expect(host.innerHTML).toContain('Fixture Museum')
    expect(host.innerHTML).toContain('things')
    app.unmount()
  })

  it('renders the entity list from the data package', async () => {
    const { app, host, router } = await mountViewer()
    await router.push('/things')
    await vi.waitFor(() => expect(host.innerHTML).toContain('First Thing'))
    expect(host.innerHTML).toContain('Third Thing')
    app.unmount()
  })

  it('renders a detail page with markdown fields', async () => {
    const { app, host, router } = await mountViewer()
    await router.push('/things/1')
    await vi.waitFor(() => expect(host.innerHTML).toContain('First Thing'))
    expect(host.innerHTML).toContain('<strong>bold</strong>')
    app.unmount()
  })

  it('shows the not-found chrome string for a missing record', async () => {
    const { app, host, router } = await mountViewer()
    await router.push('/things/999')
    await vi.waitFor(() => expect(host.innerHTML).toContain('This record does not exist.'))
    app.unmount()
  })
})
