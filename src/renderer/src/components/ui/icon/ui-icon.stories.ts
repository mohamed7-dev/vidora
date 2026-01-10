import type { Meta, StoryObj } from '@storybook/html'
import './ui-icon'

type IconArgs = {
  name: string
  'size(px)': number
  spin: boolean
}

const meta: Meta<IconArgs> = {
  title: 'UI/Icon',
  args: {
    name: 'settings',
    'size(px)': 24,
    spin: false
  },
  argTypes: {
    name: { control: 'text' },
    'size(px)': { control: 'number' },
    spin: { control: 'boolean' }
  }
}

export default meta

const renderIcon = (args: IconArgs): string => {
  const { name, 'size(px)': size, spin } = args

  const attrs: string[] = []

  if (name) attrs.push(`name="${name}"`)
  if (spin) attrs.push('spin')
  if (size) attrs.push(`style="--ui-icon-size: ${size}px"`)

  return `<ui-icon ${attrs.join(' ')}></ui-icon>`
}

type Story = StoryObj<IconArgs>

export const Playground: Story = {
  render: (args) => renderIcon(args)
}
