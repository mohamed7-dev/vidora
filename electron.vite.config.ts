import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { join } from 'path'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    base: './',
    build: {
      rollupOptions: {
        input: {
          index: join(__dirname, 'src/renderer/pages/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': fileURLToPath(new URL('./src/renderer/src', import.meta.url)),
        '@root': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
