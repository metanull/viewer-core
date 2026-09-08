/**
 * Vite configuration helper for viewer websites.
 * This is a separate entry point because Vite's config loader runs under Node.js,
 * which cannot parse .vue files. The ./testing barrel re-exports mountSite and
 * other test utilities that import createViewer → AppRoot.vue, making it unsafe
 * to import from a vite.config.js. This entry avoids that chain.
 */
export { defineViewerConfig } from './testing/viteConfig.js'
