import type { Meta, StoryObj } from '@storybook/html'
import './ui-select'
import './ui-select-trigger'
import './ui-select-portal'
import './ui-select-content'
import './ui-select-option'
import './ui-select-value'
import '../button/ui-button'
import '../icon/ui-icon'
import { UiSelectAlign } from './constants'

type SelectArgs = {
  open: boolean
  disabled: boolean
  required: boolean
  align: UiSelectAlign
  offset: number
  value: string
}

const meta: Meta<SelectArgs> = {
  title: 'UI/Select',
  args: {
    open: false,
    disabled: false,
    offset: 4,
    align: 'center',
    required: false,
    value: ''
  },
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    offset: { control: 'number' },
    align: { control: 'select', options: ['center', 'start', 'end'] },
    value: { control: 'text' }
  }
}

export default meta

type Story = StoryObj<SelectArgs>

const renderSelect = (args: SelectArgs, slottable: boolean, isFormAssociated?: boolean): string => {
  const { open, disabled, required, value, offset, align } = args

  const attrs: string[] = []

  if (disabled) attrs.push('disabled')
  if (open) attrs.push('open')
  if (required) attrs.push('required')
  if (value) attrs.push(`value="${value}"`)
  attrs.push(`name="theme"`)

  let trigger = ''
  let items = ''
  if (slottable) {
    trigger = `
        <ui-select-trigger as-child>
            <ui-button>
                <ui-select-value placeholder="Select Theme"></ui-select-value>
                <ui-icon name="chevrons-up-down"></ui-icon>
            </ui-button>
        </ui-select-trigger>
        `
    items = `
        <ui-select-option value="dark" as-child>
            <ui-button variant="outline" block>
                Dark
            </ui-button>
        </ui-select-option>
        <ui-select-option value="light" as-child>
            <ui-button variant="outline" block>
                Light
            </ui-button>
        </ui-select-option>
    `
  } else {
    trigger = `
        <ui-select-trigger>
            <ui-select-value placeholder="Select Theme"></ui-select-value>
            <ui-icon name="chevrons-up-down"></ui-icon>
        </ui-select-trigger>
    `
    items = `
        <ui-select-option value="dark">
            Dark
        </ui-select-option>
        <ui-select-option value="light">
            Light
        </ui-select-option>
    `
  }

  const portalAttrs: string[] = []
  if (align) portalAttrs.push(`align="${align}"`)
  if (offset) portalAttrs.push(`offset="${offset}"`)

  const select = `
    <ui-select ${attrs.join(' ')} style="margin-inline-start: 20rem">
      ${trigger}
      <ui-select-portal ${portalAttrs.join(' ')}>
        <ui-select-content>
            ${items}
        </ui-select-content>
      </ui-select-portal>
    </ui-select>
  `

  window.setTimeout(() => {
    const form = document.querySelector<HTMLFormElement>('#select-form')
    if (!form) return
    form.onsubmit = (event) => {
      event.preventDefault()
      const data = new FormData(form)
      console.log('FormData entries:', Array.from(data.entries()))
    }
  })

  return !isFormAssociated
    ? select
    : `
        <form id="select-form">
            ${select}
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <ui-button type="submit">
                <span>Submit</span>
            </ui-button>
            <ui-button type="reset" variant="outline">
                <span>Reset</span>
            </ui-button>
            </div>
        </form>
  `
}

export const SelectWithoutAsChild: Story = {
  render: (args) => renderSelect(args, false)
}

export const SelectWithAsChild: Story = {
  render: (args) => renderSelect(args, true)
}

export const SelectFormAssociated: Story = {
  render: (args) => renderSelect(args, true, true)
}
