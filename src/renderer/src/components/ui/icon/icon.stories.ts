import type { Meta, StoryObj } from '@storybook/html'
import './index'

const meta: Meta = {
  title: 'UI/Icon'
}

export default meta

type Story = StoryObj

export const Settings: Story = {
  render: () => `<ui-icon name="settings"></ui-icon>`
}

export const Loader: Story = {
  render: () => `<ui-icon name="loader-circle" spin></ui-icon>`
}
