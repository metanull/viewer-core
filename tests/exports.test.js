import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Vitest runs from the package root, and its `import.meta.url` is a module id
// rather than a file URL, so the manifest is read by path.
const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

// An entry point is a promise to another package, and nothing else in this
// repository would notice it being broken: viewer-layout imports
// `@metanull/viewer-core/i18n`, and a release that forgot to declare it failed
// there rather than here.
describe('the package entry points', () => {
  it('gives viewer-layout the text runtime without the application engine', () => {
    expect(pkg.exports['./i18n']).toBe('./src/i18n/index.js')
  })

  it('points every entry point at a file that exists', () => {
    for (const [name, target] of Object.entries(pkg.exports)) {
      expect(existsSync(join(root, target)), `${name} -> ${target}`).toBe(true)
    }
  })

  it('ships everything the entry points name', () => {
    for (const target of Object.values(pkg.exports)) {
      expect(pkg.files.some((included) => target.startsWith(`./${included}`))).toBe(true)
    }
  })
})
