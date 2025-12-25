import type { Meta, StoryObj } from '@storybook/html'
import './index'
import type { UIInputVariants, UIInputSizes } from './index'

type InputArgs = {
  label: string
  placeholder: string
  value: string
  type: string
  description: string
  errorMessage: string
  variant: UIInputVariants
  size: UIInputSizes
  disabled: boolean
  invalid: boolean
  autofocus: boolean
}

const meta: Meta<InputArgs> = {
  title: 'UI/Input',
  args: {
    label: 'Input',
    placeholder: 'email address',
    value: '',
    type: 'email',
    description: 'enter your email address',
    errorMessage: '',
    variant: 'default',
    size: 'default',
    disabled: false,
    invalid: false,
    autofocus: true
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    type: { control: 'text' },
    description: { control: 'text' },
    errorMessage: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'underline']
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'md']
    },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    autofocus: { control: 'boolean' }
  }
}

export default meta

type Story = StoryObj<InputArgs>

const renderInput = (args: InputArgs): string => {
  const {
    label,
    description,
    errorMessage,
    placeholder,
    value,
    type,
    variant,
    size,
    disabled,
    invalid,
    autofocus
  } = args

  const attrs: string[] = []

  if (variant) attrs.push(`variant="${variant}"`)
  if (size) attrs.push(`size="${size}"`)
  if (disabled) attrs.push('disabled')
  if (invalid) attrs.push('invalid')
  if (autofocus) attrs.push('autofocus')
  if (value) attrs.push(`value="${value}"`)
  if (placeholder) attrs.push(`placeholder="${placeholder}"`)
  if (type) attrs.push(`type="${type}"`)
  // let the form see name/value
  attrs.push(`name="email"`)
  // Attach a submit handler that logs the FormData so you can inspect it
  window.setTimeout(() => {
    const form = document.querySelector<HTMLFormElement>('#input-form')
    if (!form) return
    form.onsubmit = (event) => {
      event.preventDefault()

      const data = new FormData(form)
      console.log('FormData entries:', Array.from(data.entries()))
    }
    // const input = document.querySelector<UIInput>('ui-input')
    // if (!input) return
    // input.addEventListener(() => )
  })
  return `
    <form id="input-form">
        <ui-input ${attrs.join(' ')}>
          <span slot="label">
            ${label}
          </span>
          ${description ? `<span slot="description">${description}</span>` : ''}
          ${invalid ? `<span slot="error">${errorMessage}</span>` : ''}
        </ui-input>
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
          <ui-button type="submit">
            <span slot="label">Submit</span>
          </ui-button>
          <ui-button type="reset" variant="outline">
            <span slot="label">Reset</span>
          </ui-button>
        </div>
    </form>
  `
}

export const Playground: Story = {
  render: (args) => renderInput(args)
}
