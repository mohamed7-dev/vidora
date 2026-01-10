import type { Meta, StoryObj } from '@storybook/html'
import './ui-dropdown'
import './ui-dropdown-trigger'
import './ui-dropdown-portal'
import './ui-dropdown-content'
import './ui-dropdown-item'
import '../button/ui-button'
import '../icon/ui-icon'
import { UiDropdownAlign } from './constants'

type DropdownArgs = {
  open: boolean
  disabled: boolean
  align: UiDropdownAlign
  offset: number
}

const meta: Meta<DropdownArgs> = {
  title: 'UI/Dropdown',
  args: {
    open: false,
    disabled: false,
    offset: 4,
    align: 'center'
  },
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    offset: { control: 'number' },
    align: { control: 'select', options: ['center', 'start', 'end'] }
  }
}

export default meta

type Story = StoryObj<DropdownArgs>

const renderDropdown = (args: DropdownArgs, slottable: boolean): string => {
  const { open, disabled, offset, align } = args

  const attrs: string[] = []

  if (disabled) attrs.push('disabled')
  if (open) attrs.push('open')

  let trigger = ''
  let items = ''
  if (slottable) {
    trigger = `
        <ui-dropdown-trigger as-child>
            <ui-button size="icon">
                <ui-icon name="plus"></ui-icon>
            </ui-button>
        </ui-dropdown-trigger>
        `
    items = `
        <ui-dropdown-item as-child>
            <ui-button variant="outline" block>
                Add Pin
            </ui-button>
        </ui-dropdown-item>
        <ui-dropdown-item as-child>
            <ui-button variant="outline" block>
                Add Board
            </ui-button>
        </ui-dropdown-item>
    `
  } else {
    trigger = `
        <ui-dropdown-trigger>
            <span>Add More</span>
        </ui-dropdown-trigger>
    `
    items = `
        <ui-dropdown-item>
                Add Pin
        </ui-dropdown-item>
        <ui-dropdown-item>
                Add Board
        </ui-dropdown-item>
    `
  }

  const portalAttrs: string[] = []
  if (align) portalAttrs.push(`align="${align}"`)
  if (offset) portalAttrs.push(`offset="${offset}"`)

  return `
    <ui-dropdown ${attrs.join(' ')} style="margin-inline-start: 20rem">
      ${trigger}
      <ui-dropdown-portal ${portalAttrs.join(' ')}>
        <ui-dropdown-content>
            ${items}
        </ui-dropdown-content>
      </ui-dropdown-portal>
    </ui-dropdown>
  `
}

export const DropdownWithoutAsChild: Story = {
  render: (args) => renderDropdown(args, false)
}

export const DropdownWithAsChild: Story = {
  render: (args) => renderDropdown(args, true)
}
