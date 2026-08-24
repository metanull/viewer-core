import { createApp } from 'vue'
import AppRoot from './AppRoot.vue'
import { useDataPackage } from './composables/useDataPackage.js'
import { createViewerI18n } from './i18n/index.js'
import { VIEWER_CONFIG } from './injectionKeys.js'
import { createViewerRouter } from './router/index.js'
import './styles/base.css'

export function createViewer(config = {}) {
  const { languages: datasetLanguages } = useDataPackage()
  const languages = config.languages ?? datasetLanguages

  const router = createViewerRouter(config)
  const i18n = createViewerI18n({ languages, messages: config.messages })

  const app = createApp(AppRoot)
  app.provide(VIEWER_CONFIG, { ...config, languages })
  app.use(router)
  app.use(i18n)
  return app
}
