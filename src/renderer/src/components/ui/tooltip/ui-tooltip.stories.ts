import type { Meta, StoryObj } from '@storybook/html'
import './ui-tooltip'
import './ui-tooltip-trigger'
import './ui-tooltip-portal'
import './ui-tooltip-content'
import '../button/ui-button'
import '../icon/ui-icon'
import { UiTooltipSide, UiTooltipAlign } from './constants'

type TooltipArgs = {
  open: boolean
  disabled: boolean
  side: UiTooltipSide
  align: UiTooltipAlign
  offset: number
}

const meta: Meta<TooltipArgs> = {
  title: 'UI/Tooltip',
  args: {
    open: false,
    disabled: false,
    offset: 10,
    align: 'center',
    side: 'bottom'
  },
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    offset: { control: 'number' },
    align: { control: 'select', options: ['center', 'start', 'end'] },
    side: { control: 'select', options: ['right', 'left', 'top', 'bottom'] }
  }
}

export default meta

type Story = StoryObj<TooltipArgs>

const renderTooltip = (args: TooltipArgs, slottable: boolean): string => {
  const { open, disabled, offset, align, side } = args

  const attrs: string[] = []

  if (disabled) attrs.push('disabled')
  if (open) attrs.push('open')
  if (align) attrs.push(`align="${align}"`)
  if (side) attrs.push(`side="${side}"`)
  if (offset) attrs.push(`offset="${offset}"`)

  let trigger = ''
  if (slottable) {
    trigger = `
        <ui-tooltip-trigger as-child>
            <ui-button variant="outline" size="icon">
                <span>!</span>
            </ui-button>
        </ui-tooltip-trigger>
        `
  } else {
    trigger = `
        <ui-tooltip-trigger>
            <span>!</span>
        </ui-tooltip-trigger>
    `
  }

  return `
    <ui-tooltip ${attrs.join(' ')} style="margin-inline-start: 20rem">
      ${trigger}
      <ui-tooltip-portal>
        <ui-tooltip-content>
            <p>Tooltip Content</p>
        </ui-tooltip-content>
      </ui-tooltip-portal>
    </ui-tooltip>
  `
}

export const TooltipWithoutAsChild: Story = {
  render: (args) => renderTooltip(args, false)
}

export const TooltipWithAsChild: Story = {
  render: (args) => renderTooltip(args, true)
}
