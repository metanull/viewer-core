import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createViewer } from '../src/index.js'
import { messages } from './fixtures/messages.js'

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
          {
            class: 'fake-shell__switch',
            onClick: () => emit('update:language', props.languages[1] ?? 'fr'),
          },
          'switch',
        ),
        h(
          'button',
          { class: 'fake-shell__bogus', onClick: () => emit('update:language', 'xx') },
          'bogus',
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
  messages,
}

// The visitor's choice is remembered between visits, so each test starts as a
// first visit; otherwise the language one test picks decides the next one's.
beforeEach(() => localStorage.clear())

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

  it('sets the language when the shell emits update:language', async () => {
    const { app, host } = await mountViewer()
    host.querySelector('.fake-shell__switch').click()
    await vi.waitFor(() =>
      expect(host.querySelector('.fake-shell__language').textContent).toBe('fr')
    )
    app.unmount()
  })

  it('remembers the choice, and sets the document direction', async () => {
    const first = await mountViewer({ languages: ['en', 'ar'] })
    first.host.querySelector('.fake-shell__switch').click()
    await vi.waitFor(() => expect(document.documentElement.getAttribute('dir')).toBe('rtl'))
    first.app.unmount()

    const { app, host } = await mountViewer({ languages: ['en', 'ar'] })
    await vi.waitFor(() =>
      expect(host.querySelector('.fake-shell__language').textContent).toBe('ar')
    )
    app.unmount()
  })

  it('ignores a language the website does not offer', async () => {
    const { app, host } = await mountViewer()
    host.querySelector('.fake-shell__bogus').click()
    await Promise.resolve()
    expect(host.querySelector('.fake-shell__language').textContent).toBe('en')
    app.unmount()
  })

  it('renders no shell wrapper when config.shell is absent', async () => {
    const { app, host } = await mountViewer({ shell: undefined, navigation: undefined })
    expect(host.querySelector('.fake-shell')).toBeNull()
    expect(host.innerHTML).toContain('Fixture Museum')
    app.unmount()
  })
})
