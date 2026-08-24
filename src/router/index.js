import { createRouter, createWebHashHistory } from 'vue-router'
import DetailView from '../views/DetailView.vue'
import HomeView from '../views/HomeView.vue'
import ListView from '../views/ListView.vue'

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

  return createRouter({
    history: createWebHashHistory(),
    routes,
  })
}
