import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@inventory-data': fileURLToPath(new URL('./tests/fixtures/data-package', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
  },
})
