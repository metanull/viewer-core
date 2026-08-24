<script setup>
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
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

function setLanguage(language) {
  locale.value = language
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
