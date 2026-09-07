import { describe, expect, it } from 'vitest'
import { defineViewerConfig } from '../src/testing/index.js'

describe('defineViewerConfig', () => {
  it('returns a vite config object with required properties', () => {
    const config = defineViewerConfig({ dataPackage: '@metanull/test-data' })

    expect(config).toHaveProperty('plugins')
    expect(config).toHaveProperty('resolve')
    expect(config).toHaveProperty('optimizeDeps')
    expect(config).toHaveProperty('test')
  })

  it('sets the @inventory-data alias to the data package', () => {
    const config = defineViewerConfig({ dataPackage: '@metanull/test-data' })

    expect(config.resolve.alias).toBeDefined()
    expect(config.resolve.alias['@inventory-data']).toBeDefined()
  })

  it('excludes the viewer packages from optimization', () => {
    const config = defineViewerConfig({ dataPackage: '@metanull/test-data' })

    expect(config.optimizeDeps.exclude).toContain('@metanull/viewer-core')
    expect(config.optimizeDeps.exclude).toContain('@metanull/viewer-core/i18n')
    expect(config.optimizeDeps.exclude).toContain('@metanull/viewer-layout')
  })

  it('includes vue and vue-router in optimization', () => {
    const config = defineViewerConfig({ dataPackage: '@metanull/test-data' })

    expect(config.optimizeDeps.include).toContain('vue')
    expect(config.optimizeDeps.include).toContain('vue-router')
  })

  it('sets the test environment to jsdom with 60s timeout', () => {
    const config = defineViewerConfig({ dataPackage: '@metanull/test-data' })

    expect(config.test.environment).toBe('jsdom')
    expect(config.test.testTimeout).toBe(60000)
  })

  it('inlines the core viewer packages and layout for testing', () => {
    const config = defineViewerConfig({ dataPackage: '@metanull/test-data' })

    expect(config.test.server.deps.inline).toContain('@metanull/viewer-core')
    expect(config.test.server.deps.inline).toContain('@metanull/viewer-layout')
  })

  it('includes extra packages in the inline list', () => {
    const config = defineViewerConfig({
      dataPackage: '@metanull/test-data',
      inline: ['extra-package-1', 'extra-package-2'],
    })

    expect(config.test.server.deps.inline).toContain('extra-package-1')
    expect(config.test.server.deps.inline).toContain('extra-package-2')
  })

  it('accepts plugins as a parameter', () => {
    const mockPlugin = { name: 'mock' }
    const config = defineViewerConfig({
      dataPackage: '@metanull/test-data',
      plugins: [mockPlugin],
    })

    expect(config.plugins).toContain(mockPlugin)
  })
})
