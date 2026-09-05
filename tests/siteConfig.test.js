import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createViewer, mediaUrl, useSiteConfig } from '../src/index.js'
import { messages } from './fixtures/messages.js'

const config = {
  datasetPackage: '@metanull/fixture-data',
  siteName: 'Fixture Museum',
  messages,
  media: { legacyHost: 'https://images.example.org/' },
  links: { portal: 'https://www.example.org', about: 'https://www.example.org/about' },
}

describe('the site configuration', () => {
  it('is readable outside a component once the application exists', () => {
    createViewer(config)
    expect(useSiteConfig().links.portal).toBe('https://www.example.org')
    expect(useSiteConfig().languages).toEqual(['en', 'fr', 'de'])
  })

  it('is the injected one inside a component', async () => {
    const app = createViewer(config)
    const host = document.createElement('div')
    app.mount(host)
    let seen
    mount(
      {
        setup() {
          seen = useSiteConfig()
          return () => null
        },
      },
      { global: { provide: {} } },
    )
    expect(seen.links.about).toBe('https://www.example.org/about')
    app.unmount()
  })
})

describe('mediaUrl', () => {
  it('builds a legacy media address from the declared host', () => {
    createViewer(config)
    expect(mediaUrl('galleries/carpets/banner.jpg')).toBe(
      'https://images.example.org/hi_res/galleries/carpets/banner.jpg',
    )
    expect(mediaUrl('/galleries/carpets/banner.jpg', 'small')).toBe(
      'https://images.example.org/small/galleries/carpets/banner.jpg',
    )
  })

  it('leaves an address alone and reads nothing as nothing', () => {
    createViewer(config)
    expect(mediaUrl('https://cdn.example.org/x.jpg')).toBe('https://cdn.example.org/x.jpg')
    expect(mediaUrl('')).toBeNull()
    expect(mediaUrl(null)).toBeNull()
  })

  it('answers nothing when the website declares no host', () => {
    createViewer({ ...config, media: undefined })
    expect(mediaUrl('x.jpg')).toBeNull()
  })
})
