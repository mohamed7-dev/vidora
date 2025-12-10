import type { Meta, StoryObj } from '@storybook/html'
import '../icon/index' // defines <ui-icon>
import './index' // defines <ui-button>
import type { UIButtonVariant, UIButtonSize } from './index'

type ButtonArgs = {
  label: string
  variant: UIButtonVariant
  size: UIButtonSize
  disabled: boolean
  loading: boolean
  toggle: boolean
  pressed: boolean
}

const meta: Meta<ButtonArgs> = {
  title: 'UI/Button',
  args: {
    label: 'Button',
    variant: 'default',
    size: 'default',
    disabled: false,
    loading: false,
    toggle: false,
    pressed: false
  },
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive']
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon']
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    toggle: { control: 'boolean' },
    pressed: { control: 'boolean' }
  }
}

export default meta

type Story = StoryObj<ButtonArgs>

const renderButton = (args: ButtonArgs): string => {
  const { label, variant, size, disabled, loading, toggle, pressed } = args

  const attrs: string[] = []

  if (variant) attrs.push(`variant="${variant}"`)
  if (size) attrs.push(`size="${size}"`)
  if (disabled) attrs.push('disabled')
  if (loading) attrs.push('loading')
  if (toggle) attrs.push('toggle')
  if (pressed) attrs.push('pressed')

  return `
    <ui-button ${attrs.join(' ')}>
      ${label}
    </ui-button>
  `
}

export const Playground: Story = {
  render: (args) => renderButton(args)
}
