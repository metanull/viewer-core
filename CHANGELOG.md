# Changelog

## 0.2.0

- New optional `config.shell`: a page-shell component (e.g. `PageShell` from
  `@metanull/viewer-layout`) rendered around the active view. It receives
  `languages`, everything in `config.navigation`, and the reactive `language`;
  its `update:language` event sets the global vue-i18n locale.

## 0.1.0

- Initial release: createViewer, useDataPackage, hash router with feature-flagged routes, vue-i18n harness with default English chrome strings, HomeView / ListView / DetailView, structural base.css.

