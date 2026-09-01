// A website always passes a merged catalogue to createViewer; these tests do
// the same. The values are the English `core` entries of @metanull/viewer-i18n,
// copied rather than imported: a unit test should fail when this package
// breaks, not when a text is edited in the dictionary.
export const messages = {
  en: {
    'core.detail.notFound': 'This record does not exist.',
    'core.list.empty': 'Nothing to display yet.',
    'core.nav.backToList': 'Back to the list',
    'core.nav.home': 'Home',
    'core.pagination.next': 'Next',
    'core.pagination.previous': 'Previous',
    'core.status.loading': 'Loading…',
  },
  fr: {
    'core.nav.home': 'Accueil',
  },
}
