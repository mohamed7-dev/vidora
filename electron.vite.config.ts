import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
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
    resolve: {
      alias: {
        '@renderer': fileURLToPath(new URL('./src/renderer/src', import.meta.url)),
        '@ui': fileURLToPath(new URL('./src/renderer/src/components/ui', import.meta.url)),
        '@root': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
})
