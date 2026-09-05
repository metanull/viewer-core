import { getCurrentInstance, inject } from 'vue'
import { VIEWER_CONFIG } from './injectionKeys.js'

// `dataset.config.js` is the whole declaration of a website. What a site
// needs outside a component — a composable building an image address, a
// route helper — reads it from here; a component may inject it as well.

let current = {}

export function setSiteConfig(config) {
  current = config ?? {}
}

/** The website's configuration, as `createViewer` received it. */
export function useSiteConfig() {
  if (getCurrentInstance()) {
    const injected = inject(VIEWER_CONFIG, null)
    if (injected) return injected
  }
  return current
}

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

/**
 * The address of a legacy media file, from the path the data package carries
 * and the host `config.media.legacyHost` declares. `size` is one of the
 * legacy server's size names (`zoom`, `hi_res`, `lo_res`, `small`). A path
 * that is already an address is returned as it is.
 */
export function mediaUrl(path, size = 'hi_res') {
  if (!path) return null
  if (ABSOLUTE.test(path)) return path
  const host = String(useSiteConfig().media?.legacyHost ?? '').replace(/\/+$/, '')
  if (!host) return null
  return `${host}/${size}/${String(path).replace(/^\/+/, '')}`
}
