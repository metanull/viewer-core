import { createApp, watch } from 'vue'
import AppRoot from './AppRoot.vue'
import { useDataPackage } from './composables/useDataPackage.js'
import { createI18n } from './i18n/index.js'
import { connectLanguageToRouter, resolveInitialLanguage } from './i18n/language.js'
import { createLegacyI18n } from './i18n/vue-i18n-bridge.js'
import { VIEWER_CONFIG } from './injectionKeys.js'
import { createViewerRouter } from './router/index.js'
import './styles/base.css'

export function createViewer(config = {}) {
  const { languages: datasetLanguages } = useDataPackage()
  const languages = config.languages ?? datasetLanguages
  const messages = config.messages ?? {}

  const router = createViewerRouter(config)
  const i18n = createI18n({ messages, locale: resolveInitialLanguage(languages) })
  const legacyI18n = createLegacyI18n({ languages, messages })

  const app = createApp(AppRoot)
  app.provide(VIEWER_CONFIG, { ...config, languages })
  app.use(router)
  app.use(legacyI18n)
  app.use(i18n)

  connectLanguageToRouter({ locale: i18n.locale, offered: languages, router })
  // See vue-i18n-bridge.js: while websites still read the content language
  // from vue-i18n, its locale has to follow the one language the application
  // actually has.
  watch(i18n.locale, (code) => { legacyI18n.global.locale.value = code }, { immediate: true })

  return app
}
