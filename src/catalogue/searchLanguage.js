import { computed, ref, watch } from 'vue'
import { useDataPackage } from '../composables/useDataPackage.js'

/**
 * The search-language rule: a sorted list of languages the entity's
 * translations exist in, and a watcher that loads them when the selection
 * changes. Three Database pages carry this watch locally, reading three
 * different entity names.
 */
export function useSearchLanguage(entity) {
  const { availableLanguages, loadTranslations } = useDataPackage()

  // The languages the entity actually carries translations in, sorted.
  const languages = computed(() => {
    const available = availableLanguages(entity)
    return available.slice().sort()
  })

  // The user's current selection.
  const language = ref('')

  // Load translations when the selection changes; the watch runs immediately
  // so the reference language (English, the index language) is always there.
  watch(() => language.value, (lang) => {
    if (lang) loadTranslations(entity, lang)
  }, { immediate: true })

  return {
    languages,
    language,
  }
}
