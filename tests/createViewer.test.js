import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createViewer } from '../src/index.js'
import { messages } from './fixtures/messages.js'

const config = {
  datasetPackage: '@metanull/fixture-data',
  siteName: 'Fixture Museum',
  features: { entities: ['things'] },
  messages,
}

beforeEach(() => localStorage.clear())

async function mountViewer(hash = '#/') {
  window.location.hash = hash
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

  it('shows the not-found text for a missing record', async () => {
    const { app, host, router } = await mountViewer()
    await router.push('/things/999')
    await vi.waitFor(() => expect(host.innerHTML).toContain('This record does not exist.'))
    app.unmount()
  })

  it('opens on the page a deep link names, with the language added', async () => {
    // What a visitor arriving from a bookmark or a shared link gets. The
    // language watcher used to rewrite the URL from the router's start
    // location before the first navigation resolved, and every deep link
    // landed on the home page.
    const { app, host, router } = await mountViewer('#/things/1')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/things/1'))
    expect(router.currentRoute.value.query.lang).toBe('en')
    await vi.waitFor(() => expect(host.innerHTML).toContain('<strong>bold</strong>'))
    app.unmount()
  })

  it('carries the language in the URL of a multilingual website', async () => {
    const { app, router } = await mountViewer()
    await vi.waitFor(() => expect(router.currentRoute.value.query.lang).toBe('en'))
    app.unmount()
  })
})
