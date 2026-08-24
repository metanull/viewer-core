import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { createViewer } from '../src/index.js'

const FakeShell = defineComponent({
  name: 'FakeShell',
  props: {
    language: { type: String, default: '' },
    languages: { type: Array, default: () => [] },
    headerTitle: { type: String, default: '' },
  },
  emits: ['update:language'],
  setup(props, { emit, slots }) {
    return () =>
      h('div', { class: 'fake-shell' }, [
        h('p', { class: 'fake-shell__title' }, props.headerTitle),
        h('p', { class: 'fake-shell__languages' }, props.languages.join(',')),
        h('p', { class: 'fake-shell__language' }, props.language),
        h(
          'button',
          { class: 'fake-shell__switch', onClick: () => emit('update:language', 'fr') },
          'switch',
        ),
        slots.default?.(),
      ])
  },
})

const config = {
  datasetPackage: '@metanull/fixture-data',
  siteName: 'Fixture Museum',
  languages: ['en', 'fr'],
  features: { entities: ['things'] },
  shell: FakeShell,
  navigation: { headerTitle: 'Shell Title' },
}

async function mountViewer(overrides = {}) {
  window.location.hash = '#/'
  const app = createViewer({ ...config, ...overrides })
  const host = document.createElement('div')
  document.body.appendChild(host)
  app.mount(host)
  await app.config.globalProperties.$router.isReady()
  return { app, host }
}

describe('config.shell', () => {
  it('renders the shell around the active view', async () => {
    const { app, host } = await mountViewer()
    const shell = host.querySelector('.fake-shell')
    expect(shell).not.toBeNull()
    expect(shell.innerHTML).toContain('Fixture Museum')
    app.unmount()
  })

  it('passes config.navigation and the language list as props', async () => {
    const { app, host } = await mountViewer()
    expect(host.querySelector('.fake-shell__title').textContent).toBe('Shell Title')
    expect(host.querySelector('.fake-shell__languages').textContent).toBe('en,fr')
    expect(host.querySelector('.fake-shell__language').textContent).toBe('en')
    app.unmount()
  })

  it('sets the global locale when the shell emits update:language', async () => {
    const { app, host } = await mountViewer()
    host.querySelector('.fake-shell__switch').click()
    await Promise.resolve()
    expect(host.querySelector('.fake-shell__language').textContent).toBe('fr')
    app.unmount()
  })

  it('renders no shell wrapper when config.shell is absent', async () => {
    const { app, host } = await mountViewer({ shell: undefined, navigation: undefined })
    expect(host.querySelector('.fake-shell')).toBeNull()
    expect(host.innerHTML).toContain('Fixture Museum')
    app.unmount()
  })
})
