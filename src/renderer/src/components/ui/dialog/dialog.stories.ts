import type { Meta, StoryObj } from '@storybook/html'
import '../icon/index'
import './index'
import '../button/index'

type DialogArgs = {
  showXButton: boolean
  alert: boolean
  open: boolean
}

const meta: Meta<DialogArgs> = {
  title: 'UI/Dialog',
  args: {
    showXButton: true,
    alert: false,
    open: false
  },
  argTypes: {
    showXButton: { control: 'boolean' },
    alert: { control: 'boolean' },
    open: { control: 'boolean' }
  }
}

export default meta

type Story = StoryObj<DialogArgs>

const renderDialog = (args: DialogArgs): string => {
  const { showXButton, alert, open } = args

  const attrs: string[] = []

  if (showXButton) attrs.push('show-x-button')
  if (alert) attrs.push('alert')
  if (open) attrs.push('open')

  return `
    <ui-dialog ${attrs.join(' ')}>
      <ui-button slot="trigger">
        <span slot="label">Open Dialog</span>
      </ui-button>
      <div slot="content">
        <p>Dialog Content</p>
      </div>
      <ui-button slot="cancel">
        <span slot="label">Close</span>
      </ui-button>
    </ui-dialog>
  `
}

export const Playground: Story = {
  render: (args) => renderDialog(args)
}
