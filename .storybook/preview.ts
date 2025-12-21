import type { Preview } from '@storybook/html'

import '@renderer/assets/main.css'

// Match app default theme tokens.
document.documentElement.classList.add('dark')

const preview: Preview = {
  parameters: {
    controls: { expanded: true }
  }
}

export default preview
