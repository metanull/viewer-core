<script setup>
import { computed, inject, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from './i18n/index.js'
import { negotiateLanguage } from './i18n/language.js'
import { VIEWER_CONFIG } from './injectionKeys.js'

const config = inject(VIEWER_CONFIG, {})
const { locale } = useI18n()
const route = useRoute()
const router = useRouter()

// The shell receives the resolved language list, everything the website put in
// config.navigation, and the current locale — in that order, so `language`
// always reflects the live locale.
const shellProps = computed(() => ({
  languages: config.languages,
  ...(config.navigation ?? {}),
  language: locale.value,
}))

// The shell is the website's own component, so what it emits is checked here
// rather than trusted: the active language is always one the website offers.
function setLanguage(language) {
  locale.value = negotiateLanguage(config.languages, { requested: language })
}

// Until the first navigation has resolved — which includes loading the
// entities the route declares — there is no view to show, and the page says
// so rather than staying blank.
const navigating = ref(true)
router.beforeEach(() => {
  navigating.value = true
})
router.afterEach(() => {
  navigating.value = false
})
router.onError(() => {
  navigating.value = false
})
const loading = computed(() => navigating.value && route.matched.length === 0)
</script>

<template>
  <component
    :is="config.shell"
    v-if="config.shell"
    v-bind="shellProps"
    @update:language="setLanguage"
  >
    <p v-if="loading" class="vc-loading">{{ $t('core.status.loading') }}</p>
    <router-view v-else />
  </component>
  <template v-else>
    <p v-if="loading" class="vc-loading">{{ $t('core.status.loading') }}</p>
    <router-view v-else />
  </template>
</template>
