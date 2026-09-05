import { computed, ref, toValue, watch } from 'vue'
import { useI18n } from '../i18n/index.js'
import { isRtl } from '../i18n/language.js'
import { useDataPackage } from './useDataPackage.js'

const BASE_LANGUAGE = 'en'

/**
 * The language a record is read in, given the languages it carries and the
 * language the website is in: the site language when the record has it,
 * English when it does not, the record's first language when it has neither.
 */
export function resolveRecordLanguage(languages, siteLanguage) {
  const carried = languages ?? []
  if (carried.length === 0) return siteLanguage
  return (
    carried.find((code) => code === siteLanguage) ??
    carried.find((code) => code === BASE_LANGUAGE) ??
    carried[0]
  )
}

/**
 * The site language and the record language are two different things. The
 * site language is negotiated once and holds for the whole visit; a record
 * may carry languages the site does not offer, and the visitor may read the
 * record they are on in any of them. That choice is view state: it is not in
 * the URL, it does not touch the site language, and it is forgotten when the
 * site language changes or another record is shown.
 *
 * `record` is a ref, a computed or a getter to the record; its `languages`
 * field says what it carries. A record without one carries every language
 * `entity` has a translation file for, when `entity` is given; `languages`
 * (a getter) overrides both.
 */
export function useRecordLanguage(record, { entity, languages: given } = {}) {
  const { locale } = useI18n()
  const { availableLanguages } = useDataPackage()

  const languages = computed(() => {
    const own = given ? toValue(given) : toValue(record)?.languages
    if (Array.isArray(own) && own.length > 0) return own
    return entity ? availableLanguages(entity) : []
  })

  const chosen = ref(null)
  const language = computed(() =>
    chosen.value && languages.value.includes(chosen.value)
      ? chosen.value
      : resolveRecordLanguage(languages.value, locale.value),
  )
  const dir = computed(() => (isRtl(language.value) ? 'rtl' : 'ltr'))

  function select(code) {
    if (languages.value.includes(code)) chosen.value = code
  }
  function reset() {
    chosen.value = null
  }

  watch(locale, reset)
  watch(
    () => {
      const current = toValue(record)
      return current?.id ?? current
    },
    reset,
  )

  return { language, languages, dir, select, reset }
}
