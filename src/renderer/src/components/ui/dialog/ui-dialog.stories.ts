import type { Meta, StoryObj } from '@storybook/html'
import './ui-dialog'
import './ui-dialog-trigger'
import './ui-dialog-portal'
import './ui-dialog-overlay'
import './ui-dialog-content'
import './ui-dialog-header'
import './ui-dialog-title'
import './ui-dialog-description'
import './ui-dialog-body'
import './ui-dialog-footer'
import './ui-dialog-close'
import '../button/ui-button'
import '../icon/ui-icon'

type DialogArgs = {
  hideXButton: boolean
  alert: boolean
  open: boolean
}

const meta: Meta<DialogArgs> = {
  title: 'UI/Dialog',
  args: {
    hideXButton: false,
    alert: false,
    open: false
  },
  argTypes: {
    hideXButton: { control: 'boolean' },
    alert: { control: 'boolean' },
    open: { control: 'boolean' }
  }
}

export default meta

type Story = StoryObj<DialogArgs>

const renderDialog = (
  args: DialogArgs,
  slottable: boolean,
  withHeaderActions?: boolean
): string => {
  const { hideXButton, alert, open } = args

  const attrs: string[] = []

  if (hideXButton) attrs.push('hide-x-button')
  if (alert) attrs.push('alert')
  if (open) attrs.push('open')

  let trigger = ''
  let cancel = ''
  if (slottable) {
    trigger = `
        <ui-dialog-trigger as-child>
            <ui-button>
                <ui-icon name="settings"></ui-icon>
                <span>Configure App</span>
            </ui-button>
        </ui-dialog-trigger>
        `
    cancel = `
        <ui-dialog-close as-child>
            <ui-button variant="outline">
                Cancel
            </ui-button>
        </ui-dialog-close>
    `
  } else {
    trigger = `
        <ui-dialog-trigger>
            <span>Open Dialog</span>
        </ui-dialog-trigger>
    `
    cancel = `
        <ui-dialog-close>
            Cancel
        </ui-dialog-close>
    `
  }
  let headerActions = ''
  if (withHeaderActions) {
    headerActions = `
        <ui-button variant="outline" slot="action">
            Edit
        </ui-button>
        <ui-button variant="destructive" slot="action">
            Delete
        </ui-button>
    `
  }

  return `
    <ui-dialog ${attrs.join(' ')}>
      ${trigger}
      <ui-dialog-portal>
        <ui-dialog-overlay></ui-dialog-overlay>
        <ui-dialog-content>
            <ui-dialog-header>
                <ui-dialog-title>
                    <span slot="label">Dialog title</span>
                    ${headerActions}
                </ui-dialog-title>
                <ui-dialog-description>Dialog description</ui-dialog-description>
            </ui-dialog-header>
            <ui-dialog-body>
                <p>Content body of the dialog</p>
            </ui-dialog-body>
            <ui-dialog-footer>
                ${cancel}
            </ui-dialog-footer>
        </ui-dialog-content>
      </ui-dialog-portal>
    </ui-dialog>
  `
}

export const DialogWithoutAsChild: Story = {
  render: (args) => renderDialog(args, false)
}

export const DialogWithAsChild: Story = {
  render: (args) => renderDialog(args, true)
}

export const DialogWithHeaderActions: Story = {
  render: (args) => renderDialog(args, true, true)
}
