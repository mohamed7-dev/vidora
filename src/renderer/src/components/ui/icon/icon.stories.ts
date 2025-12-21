import type { Meta, StoryObj } from '@storybook/html'
import './index'

type IconArgs = {
  name: string
  spin: boolean
}

const meta: Meta<IconArgs> = {
  title: 'UI/Icon',
  args: {
    name: 'settings',
    spin: false
  },
  argTypes: {
    name: { control: 'text' },
    spin: { control: 'boolean' }
  }
}

export default meta

const renderIcon = (args: IconArgs): string => {
  const { name, spin } = args

  const attrs: string[] = []

  if (name) attrs.push(`name="${name}"`)
  if (spin) attrs.push('spin')

  return `<ui-icon ${attrs.join(' ')}></ui-icon>`
}

type Story = StoryObj<IconArgs>

export const Playground: Story = {
  render: (args) => renderIcon(args)
}
