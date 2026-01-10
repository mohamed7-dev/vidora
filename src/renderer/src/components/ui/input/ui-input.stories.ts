import type { Meta, StoryObj } from '@storybook/html'
import './ui-input'
import '../button/ui-button'
import { UIInputSizes, UIInputVariants } from './ui-input'

type InputArgs = {
  variant: UIInputVariants
  size: UIInputSizes
  disabled: boolean
  required: boolean
  autofocus: boolean
  type: HTMLInputElement['type']
  value: string
  placeholder: string
}

const meta: Meta<InputArgs> = {
  title: 'UI/Input',
  args: {
    variant: 'default',
    size: 'default',
    disabled: false,
    required: false,
    autofocus: false,
    type: 'text',
    value: '',
    placeholder: ''
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'underline']
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg']
    },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    autofocus: { control: 'boolean' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'date', 'datetime-local', 'time', 'tel']
    },
    value: { control: 'text' },
    placeholder: { control: 'text' }
  }
}

export default meta

type Story = StoryObj<InputArgs>

const renderInputInForm = (args: InputArgs): string => {
  const { variant, size, disabled, autofocus, required, type, value, placeholder } = args

  const attrs: string[] = []

  if (variant) attrs.push(`variant="${variant}"`)
  if (size) attrs.push(`size="${size}"`)
  if (disabled) attrs.push('disabled')
  if (required) attrs.push('required')
  if (autofocus) attrs.push('autofocus')
  if (type) attrs.push(`type="${type}"`)
  if (value) attrs.push(`value="${value}"`)
  if (placeholder) attrs.push(`placeholder="${placeholder}"`)

  attrs.push(`name="note"`)
  window.setTimeout(() => {
    const form = document.querySelector<HTMLFormElement>('#input-form')
    if (!form) return
    form.onsubmit = (event) => {
      event.preventDefault()
      const data = new FormData(form)
      console.log('FormData entries:', Array.from(data.entries()))
    }
  })
  return `
    <form id="input-form">
        <label style="display: flex; gap: 0.5rem;">
            <span>Note</span>
            <ui-input ${attrs.join(' ')}></ui-input>
        </label>
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

export const InputInForm: Story = {
  render: (args) => renderInputInForm(args)
}

const renderInputWithoutForm = (args: InputArgs): string => {
  const { variant, size, disabled, autofocus, required, type, value, placeholder } = args

  const attrs: string[] = []

  if (variant) attrs.push(`variant="${variant}"`)
  if (size) attrs.push(`size="${size}"`)
  if (disabled) attrs.push('disabled')
  if (required) attrs.push('required')
  if (autofocus) attrs.push('autofocus')
  if (type) attrs.push(`type="${type}"`)
  if (value) attrs.push(`value="${value}"`)
  if (placeholder) attrs.push(`placeholder="${placeholder}"`)

  return `
        <label style="display: flex; gap: 0.5rem;">
            <span>Input</span>
            <ui-input ${attrs.join(' ')}></ui-input>
        </label>
  `
}

export const InputWithoutForm: Story = {
  render: (args) => renderInputWithoutForm(args)
}
