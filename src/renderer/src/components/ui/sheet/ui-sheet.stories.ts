import type { Meta, StoryObj } from '@storybook/html'
import './ui-sheet'
import './ui-sheet-trigger'
import './ui-sheet-portal'
import './ui-sheet-overlay'
import './ui-sheet-content'
import './ui-sheet-header'
import './ui-sheet-title'
import './ui-sheet-description'
import './ui-sheet-body'
import './ui-sheet-footer'
import './ui-sheet-close'
import '../button/ui-button'
import '../icon/ui-icon'
import { SheetSide } from './constants'

type SheetArgs = {
  hideXButton: boolean
  alert: boolean
  open: boolean
  side: SheetSide
}

const meta: Meta<SheetArgs> = {
  title: 'UI/Sheet',
  args: {
    hideXButton: false,
    alert: false,
    open: false,
    side: 'right'
  },
  argTypes: {
    hideXButton: { control: 'boolean' },
    alert: { control: 'boolean' },
    open: { control: 'boolean' },
    side: { control: 'radio', options: ['left', 'right', 'top', 'bottom'] }
  }
}

export default meta

type Story = StoryObj<SheetArgs>

const renderSheet = (args: SheetArgs, slottable: boolean, withHeaderActions?: boolean): string => {
  const { hideXButton, alert, open, side } = args

  const attrs: string[] = []

  if (hideXButton) attrs.push('hide-x-button')
  if (alert) attrs.push('alert')
  if (open) attrs.push('open')
  if (side) attrs.push(`side="${side}"`)

  let trigger = ''
  let cancel = ''
  if (slottable) {
    trigger = `
        <ui-sheet-trigger as-child>
            <ui-button>
                <ui-icon name="bell"></ui-icon>
                <span>Show Notifications</span>
            </ui-button>
        </ui-sheet-trigger>
        `
    cancel = `
        <ui-sheet-close as-child>
            <ui-button variant="outline">
                Cancel
            </ui-button>
        </ui-sheet-close>
    `
  } else {
    trigger = `
        <ui-sheet-trigger>
            <span>Open sheet</span>
        </ui-sheet-trigger>
    `
    cancel = `
        <ui-sheet-close>
            Cancel
        </ui-sheet-close>
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
    <ui-sheet ${attrs.join(' ')}>
      ${trigger}
      <ui-sheet-portal>
        <ui-sheet-overlay></ui-sheet-overlay>
        <ui-sheet-content>
            <ui-sheet-header>
                <ui-sheet-title>
                    <span slot="label">sheet title</span>
                    ${headerActions}
                </ui-sheet-title>
                <ui-sheet-description>sheet description</ui-sheet-description>
            </ui-sheet-header>
            <ui-sheet-body>
                <p>Content body of the sheet</p>
            </ui-sheet-body>
            <ui-sheet-footer>
                ${cancel}
            </ui-sheet-footer>
        </ui-sheet-content>
      </ui-sheet-portal>
    </ui-sheet>
  `
}

export const SheetWithoutAsChild: Story = {
  render: (args) => renderSheet(args, false)
}

export const SheetWithAsChild: Story = {
  render: (args) => renderSheet(args, true)
}

export const SheetWithHeaderActions: Story = {
  render: (args) => renderSheet(args, true, true)
}
