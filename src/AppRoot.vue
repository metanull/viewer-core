<script setup>
import { computed, inject } from 'vue'
import { useI18n } from './i18n/index.js'
import { negotiateLanguage } from './i18n/language.js'
import { VIEWER_CONFIG } from './injectionKeys.js'

const config = inject(VIEWER_CONFIG, {})
const { locale } = useI18n()

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
</script>

<template>
  <component
    :is="config.shell"
    v-if="config.shell"
    v-bind="shellProps"
    @update:language="setLanguage"
  >
    <router-view />
  </component>
  <router-view v-else />
</template>
