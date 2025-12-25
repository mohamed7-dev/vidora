import type { Meta, StoryObj } from '@storybook/html'
import './index'
import { UIAlertVariant } from './index'

type AlertArgs = {
  hidden: boolean
  closable: boolean
  variant: UIAlertVariant
  title: string
  description: string
}

const meta: Meta<AlertArgs> = {
  title: 'UI/Alert',
  args: {
    hidden: false,
    closable: true,
    variant: 'default',
    title: '',
    description: ''
  },
  argTypes: {
    hidden: { control: 'boolean' },
    closable: { control: 'boolean' },
    variant: { control: 'radio', options: ['default', 'destructive'] },
    title: { control: 'text', default: '' },
    description: { control: 'text', default: '' }
  }
}

export default meta

type Story = StoryObj<AlertArgs>

// Story 1: title/description set programmatically via attributes
const renderProgrammaticAlert = (args: AlertArgs): string => {
  const { hidden, closable, variant, title, description } = args

  const attrs: string[] = []

  if (hidden) attrs.push(`hidden`)
  if (closable) attrs.push(`closable`)
  if (variant) attrs.push(`variant="${variant}"`)
  if (title && title.length > 0) attrs.push(`title="${title}"`)
  if (description && description.length > 0) attrs.push(`description="${description}"`)

  return `
    <ui-alert ${attrs.join(' ')}></ui-alert>
  `
}

// Story 2: title/description provided via slots; attributes are not used
const renderSlottedAlert = (args: AlertArgs): string => {
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

export const Programmatic: Story = {
  name: 'Programmatic title/description',
  render: (args) => renderProgrammaticAlert(args)
}

export const WithSlots: Story = {
  name: 'With slots',
  render: (args) => renderSlottedAlert(args)
}
