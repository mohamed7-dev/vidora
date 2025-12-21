import type { Meta, StoryObj } from '@storybook/html'
import '../icon/index'
import './index'
import '../button/index'
import { SheetSide } from './index'

type SheetArgs = {
  showXButton: boolean
  alert: boolean
  open: boolean
  side: SheetSide
}

const meta: Meta<SheetArgs> = {
  title: 'UI/Sheet',
  args: {
    showXButton: true,
    alert: false,
    open: false,
    side: 'left'
  },
  argTypes: {
    showXButton: { control: 'boolean' },
    alert: { control: 'boolean' },
    open: { control: 'boolean' },
    side: { control: 'radio', options: ['left', 'right', 'top', 'bottom'] }
  }
}

export default meta

type Story = StoryObj<SheetArgs>

const renderSheet = (args: SheetArgs): string => {
  const { showXButton, alert, open, side } = args

  const attrs: string[] = []

  if (showXButton) attrs.push('show-x-button')
  if (alert) attrs.push('alert')
  if (open) attrs.push('open')
  attrs.push(`side="${side}"`)

  return `
    <ui-sheet ${attrs.join(' ')}>
      <ui-button slot="trigger">
        <span slot="label">Open Sheet</span>
      </ui-button>
      <div slot="content">
        <p>Sheet Content</p>
      </div>
    </ui-sheet>
  `
}

export const Playground: Story = {
  render: (args) => renderSheet(args)
}
