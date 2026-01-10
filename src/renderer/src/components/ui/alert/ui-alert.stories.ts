import type { Meta, StoryObj } from '@storybook/html'
import './ui-alert'
import './ui-alert-header'
import './ui-alert-title'
import './ui-alert-close'
import './ui-alert-icon'
import './ui-alert-content'
import { UIAlertVariant } from './constants'

type AlertArgs = {
  open: boolean
  closable: boolean
  variant: UIAlertVariant
}

const meta: Meta<AlertArgs> = {
  title: 'UI/Alert',
  args: {
    open: true,
    closable: true,
    variant: 'default'
  },
  argTypes: {
    open: { control: 'boolean' },
    closable: { control: 'boolean' },
    variant: { control: 'radio', options: ['default', 'destructive'] }
  }
}

export default meta

type Story = StoryObj<AlertArgs>

const renderAlert = (args: AlertArgs): string => {
  const { open, closable, variant } = args

  const attrs: string[] = []

  if (open) attrs.push(`open`)
  if (closable) attrs.push(`closable`)
  if (variant) attrs.push(`variant="${variant}"`)

  return `
    <ui-alert ${attrs.join(' ')}>
        <ui-alert-header>
            <ui-alert-icon></ui-alert-icon>
            <ui-alert-title>Alert title</ui-alert-title>
            <ui-alert-close></ui-alert-close>
        </ui-alert-header>
        <ui-alert-content>
            <p>Alert description</p>
        </ui-alert-content>
    </ui-alert>
  `
}

export const Default: Story = {
  render: (args) => renderAlert(args)
}
