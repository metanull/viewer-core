const entityModules = import.meta.glob('@inventory-data/*.json')
const manifestModules = import.meta.glob('@inventory-data/manifest.json', { eager: true })

const manifest = Object.values(manifestModules)[0]?.default ?? {}

const entityLoaders = {}
for (const [path, load] of Object.entries(entityModules)) {
  const name = path.split('/').pop().replace(/\.json$/, '')
  if (name !== 'manifest') {
    entityLoaders[name] = load
  }
}

export function useDataPackage() {
  return {
    manifest,
    languages: manifest.languages ?? ['en'],
    entityNames: Object.keys(entityLoaders).sort(),
    async loadEntity(name) {
      const load = entityLoaders[name]
      if (!load) {
        throw new Error(`Unknown entity "${name}" in the data package`)
      }
      const module = await load()
      return module.default ?? module
    },
  }
}
