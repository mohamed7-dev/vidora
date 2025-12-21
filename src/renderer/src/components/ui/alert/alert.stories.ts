import type { Meta, StoryObj } from '@storybook/html'
import './index'
import { UIAlertVariant } from './index'

type AlertArgs = {
  hidden: boolean
  closable: boolean
  variant: UIAlertVariant
}

const meta: Meta<AlertArgs> = {
  title: 'UI/Alert',
  args: {
    hidden: false,
    closable: true,
    variant: 'default'
  },
  argTypes: {
    hidden: { control: 'boolean' },
    closable: { control: 'boolean' },
    variant: { control: 'radio', options: ['default', 'destructive'] }
  }
}

export default meta

type Story = StoryObj<AlertArgs>

const renderAlert = (args: AlertArgs): string => {
  const { hidden, closable, variant } = args

  const attrs: string[] = []

  if (hidden) attrs.push(`hidden`)
  if (closable) attrs.push(`closable`)
  if (variant) attrs.push(`variant="${variant}"`)

  return `
    <ui-alert ${attrs.join(' ')}>
      <span slot="title">Alert Title</span>
      <span slot="description">Alert Description</span>
    </ui-alert>
  `
}

export const Playground: Story = {
  render: (args) => renderAlert(args)
}
