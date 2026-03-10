import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const resourcesDir = path.resolve(fileURLToPath(new URL('../ressources', import.meta.url)))
const frontendDir = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [frontendDir, resourcesDir],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-react-query'
          }
          if (id.includes('react')) {
            return 'vendor-react'
          }
          return 'vendor'
        },
      },
    },
  },
})
