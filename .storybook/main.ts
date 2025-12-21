import type { StorybookConfig } from '@storybook/html-vite'
import { fileURLToPath, URL } from 'node:url'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|js)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-interactions'],
  framework: {
    name: '@storybook/html-vite',
    options: {}
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@renderer': fileURLToPath(new URL('../src/renderer/src', import.meta.url)),
      '@root': fileURLToPath(new URL('../src', import.meta.url))
    }
    return config
  },
  core: {
    disableTelemetry: true
  }
}

export default config
