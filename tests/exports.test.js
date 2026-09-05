import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VIEWER_I18N } from '../src/i18n/index.js'

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

  // Two entry points onto one module means a bundler may load it twice. The
  // texts are passed between packages by provide/inject, so the key has to be
  // the same in both copies or the layout sees an application with no texts.
  it('keys the texts on a symbol shared by every copy of this module', () => {
    expect(Symbol.keyFor(VIEWER_I18N)).toBe('@metanull/viewer-core:i18n')
  })

  it('ships everything the entry points name', () => {
    for (const target of Object.values(pkg.exports)) {
      expect(pkg.files.some((included) => target.startsWith(`./${included}`))).toBe(true)
    }
  })
})

// A peer dependency is a demand on every website that installs this package,
// and vue-i18n was one for as long as the platform had two text systems. It
// has one now. Re-adding an import here would quietly put the second one back,
// and the failure would surface as an install error in seven repositories
// rather than in this one.
describe('the text system', () => {
  function sourceFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name)
      return statSync(full).isDirectory() ? sourceFiles(full) : [full]
    })
  }

  it('asks for no i18n library', () => {
    expect(Object.keys(pkg.peerDependencies)).not.toContain('vue-i18n')
    expect(Object.keys(pkg.dependencies)).not.toContain('vue-i18n')
    expect(Object.keys(pkg.devDependencies)).not.toContain('vue-i18n')
  })

  it('imports no i18n library anywhere in its source', () => {
    for (const file of sourceFiles(join(root, 'src'))) {
      expect(readFileSync(file, 'utf8'), file).not.toContain('vue-i18n')
    }
  })
})
