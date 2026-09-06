import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useListQuery } from '../src/index.js'

// The composable reads and writes the route, so it is exercised inside a
// component mounted on a router, the way a results page uses it.
async function mountAt(query, options = { keys: ['country', 'dynasty'] }) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<p />' } },
      { path: '/results', name: 'results', component: { template: '<p />' } },
    ],
  })
  await router.push({ name: 'results', query })
  let api
  mount(
    {
      setup() {
        api = useListQuery(options)
        return () => null
      },
    },
    { global: { plugins: [router] } },
  )
  return { ...api, router }
}

describe('useListQuery', () => {
  it('reads the filters and the page out of the query', async () => {
    const { filters, page, active } = await mountAt({ country: 'eg', page: '3', lang: 'fr' })
    expect(filters.country).toBe('eg')
    expect(filters.dynasty).toBe('')
    expect(page.value).toBe(3)
    expect(active.value).toBe(true)
  })

  it('reads page 1 for anything that is not a page', async () => {
    const { page, active } = await mountAt({ page: 'zero' })
    expect(page.value).toBe(1)
    expect(active.value).toBe(false)
  })

  it('writes the filters back, on the same route, dropping empties and the page', async () => {
    const { filters, apply, router } = await mountAt({ country: 'eg', page: '3', lang: 'fr' })
    filters.dynasty = 'd1'
    filters.country = ''
    await apply()
    expect(router.currentRoute.value.name).toBe('results')
    // `lang` is not this page's and travels untouched; `page` is gone.
    expect(router.currentRoute.value.query).toEqual({ dynasty: 'd1', lang: 'fr' })
  })

  it('applies a patch and navigates at once, for a control that acts on change', async () => {
    const { filters, apply, router } = await mountAt({ country: 'eg' })
    await apply({ dynasty: 'd2', ignored: 'x' })
    expect(filters.dynasty).toBe('d2')
    expect(router.currentRoute.value.query).toEqual({ country: 'eg', dynasty: 'd2' })
  })

  it('resets to no filter at all', async () => {
    const { reset, filters, router } = await mountAt({ country: 'eg', dynasty: 'd1', lang: 'fr' })
    await reset()
    expect(filters.country).toBe('')
    expect(router.currentRoute.value.query).toEqual({ lang: 'fr' })
  })

  it('changes only the page, replacing the history entry, and drops page 1', async () => {
    const { goToPage, router } = await mountAt({ country: 'eg' })
    const before = router.options.history.location
    await goToPage(4)
    expect(router.currentRoute.value.query).toEqual({ country: 'eg', page: '4' })
    // replace, not push: going back does not land on the previous page.
    expect(router.options.history.location).not.toBe(before)
    await goToPage(1)
    expect(router.currentRoute.value.query).toEqual({ country: 'eg' })
  })

  it('follows the route when it changes under the page', async () => {
    const { filters, page, router } = await mountAt({ country: 'eg' })
    await router.push({ name: 'results', query: { dynasty: 'd2', page: '2' } })
    await nextTick()
    expect(filters.country).toBe('')
    expect(filters.dynasty).toBe('d2')
    expect(page.value).toBe(2)
  })
})
