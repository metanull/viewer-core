import { createRouter, createWebHashHistory } from 'vue-router'
import { loadEntities } from '../composables/useEntities.js'
import DetailView from '../views/DetailView.vue'
import HomeView from '../views/HomeView.vue'
import ListView from '../views/ListView.vue'
import NotFoundView from '../views/NotFoundView.vue'

// The routing convention, applied to every website by the one router they
// share: hash history; every route named; `/<section>` and `/<section>/:id`
// with the package id; language, page and filters in the query; the shapes
// of legacy URLs kept as redirect-only entries; a catch-all to one not-found
// view; scroll restoration owned here, not by a shell or a view.

/**
 * Where the page is after a navigation: where it was when the visitor comes
 * back through history; at the anchor when the URL names one; where it is
 * when only a filter of the same page changed; at the top otherwise —
 * including a change of `page`, which is a new page of results and is read
 * from the beginning, and including the language, which re-renders
 * everything.
 */
export function defaultScrollBehavior(to, from, savedPosition) {
  if (savedPosition) return savedPosition
  if (to.hash) return { el: to.hash, behavior: 'smooth' }
  if (
    from.name !== undefined &&
    to.name === from.name &&
    sameParams(to.params, from.params) &&
    String(to.query.page ?? '') === String(from.query.page ?? '')
  ) {
    return false
  }
  return { top: 0 }
}

function sameParams(a, b) {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])
  for (const key of keys) {
    if (String(a?.[key] ?? '') !== String(b?.[key] ?? '')) return false
  }
  return true
}

/**
 * A legacy URL shape becomes a route that only ever redirects: `resolve`
 * receives the matched params (and the route) and answers the canonical
 * location — a name with params, or a path — or nothing, which is the
 * not-found page. It may be async, so a website can load the entity it maps
 * a legacy key through.
 */
function legacyRoute({ path, resolve, name }, index) {
  return {
    path,
    name: name ?? `legacy-${index}`,
    component: NotFoundView,
    meta: { legacy: true },
    async beforeEnter(to) {
      const target = await resolve(to.params, to)
      if (!target) {
        return { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') }, replace: true }
      }
      const location = typeof target === 'string' ? { path: target } : { ...target }
      return { ...location, replace: true }
    },
  }
}

export function createViewerRouter(config = {}) {
  const routes = [{ path: '/', name: 'home', component: HomeView }]

  for (const entity of config.features?.entities ?? []) {
    routes.push({
      path: `/${entity}`,
      name: `${entity}-list`,
      component: ListView,
      props: { entity },
    })
    routes.push({
      path: `/${entity}/:id`,
      name: `${entity}-detail`,
      component: DetailView,
      props: (route) => ({ entity, id: route.params.id }),
    })
  }

  for (const record of config.extraViews ?? []) {
    routes.push(record)
  }
  for (const record of config.routes ?? []) {
    routes.push(record)
  }
  for (const [index, entry] of (config.legacyRoutes ?? []).entries()) {
    routes.push(legacyRoute(entry, index))
  }
  if (config.notFound !== false) {
    routes.push({
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: config.notFound ?? NotFoundView,
    })
  }

  const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior: config.scrollBehavior ?? defaultScrollBehavior,
  })

  // A route that names the entities it reads has them loaded before its view
  // exists, so the view never renders against records that are not there yet.
  router.beforeResolve(async (to) => {
    const names = [...new Set(to.matched.flatMap((record) => record.meta?.entities ?? []))]
    if (names.length > 0) await loadEntities(names)
  })

  return router
}
