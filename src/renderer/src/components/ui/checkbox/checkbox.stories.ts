import type { Meta, StoryObj } from '@storybook/html'
import './index'
import type { UICheckboxVariants, UICheckboxSizes } from './index'

type CheckboxArgs = {
  label: string
  checked: boolean
  description: string
  errorMessage: string
  variant: UICheckboxVariants
  size: UICheckboxSizes
  disabled: boolean
  invalid: boolean
  autofocus: boolean
}

const meta: Meta<CheckboxArgs> = {
  title: 'UI/Checkbox',
  args: {
    label: 'Do you agree to the terms and conditions?',
    checked: false,
    description: '',
    errorMessage: '',
    variant: 'default',
    size: 'default',
    disabled: false,
    invalid: false,
    autofocus: true
  },
  argTypes: {
    label: { control: 'text' },
    checked: { control: 'boolean' },
    description: { control: 'text' },
    errorMessage: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'destructive']
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg']
    },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    autofocus: { control: 'boolean' }
  }
}

export default meta

type Story = StoryObj<CheckboxArgs>

const renderCheckbox = (args: CheckboxArgs): string => {
  const { label, checked, description, errorMessage, variant, size, disabled, invalid, autofocus } =
    args

  const attrs: string[] = []

  if (variant) attrs.push(`variant="${variant}"`)
  if (size) attrs.push(`size="${size}"`)
  if (disabled) attrs.push('disabled')
  if (invalid) attrs.push('invalid')
  if (autofocus) attrs.push('autofocus')
  if (checked) attrs.push(`checked`)

  // let the form see name/value
  attrs.push(`name="terms"`)
  // Attach a submit handler that logs the FormData so you can inspect it
  window.setTimeout(() => {
    const form = document.querySelector<HTMLFormElement>('#checkbox-form')
    if (!form) return
    form.onsubmit = (event) => {
      event.preventDefault()

      const data = new FormData(form)
      console.log('FormData entries:', Array.from(data.entries()))
    }
  })
  return `
    <form id="checkbox-form">
        <ui-checkbox ${attrs.join(' ')}>
          <span slot="label">${label}</span>
          ${description ? `<span slot="description">${description}</span>` : ''}
          ${invalid ? `<span slot="error">${errorMessage}</span>` : ''}
        </ui-checkbox>
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
  render: (args) => renderCheckbox(args)
}
