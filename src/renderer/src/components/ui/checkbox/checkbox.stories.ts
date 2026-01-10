import type { Meta, StoryObj } from '@storybook/html'
import './ui-checkbox'
import '../button/ui-button'
import type { UICheckboxVariants, UICheckboxSizes } from './ui-checkbox'

type CheckboxArgs = {
  checked: boolean
  variant: UICheckboxVariants
  size: UICheckboxSizes
  disabled: boolean
  required: boolean
  invalid: boolean
  autofocus: boolean
}

const meta: Meta<CheckboxArgs> = {
  title: 'UI/Checkbox',
  args: {
    checked: false,
    variant: 'default',
    size: 'default',
    disabled: false,
    required: false,
    invalid: false,
    autofocus: false
  },
  argTypes: {
    checked: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'destructive']
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg']
    },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    invalid: { control: 'boolean' },
    autofocus: { control: 'boolean' }
  }
}

export default meta

type Story = StoryObj<CheckboxArgs>

const renderCheckboxInForm = (args: CheckboxArgs): string => {
  const { checked, variant, size, disabled, invalid, autofocus, required } = args

  const attrs: string[] = []

  if (variant) attrs.push(`variant="${variant}"`)
  if (size) attrs.push(`size="${size}"`)
  if (disabled) attrs.push('disabled')
  if (required) attrs.push('required')
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
        <label style="display: flex; gap: 0.5rem;">
            <ui-checkbox ${attrs.join(' ')}></ui-checkbox>
            <span>Do you agree to the terms?</span>
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

export const CheckboxInForm: Story = {
  render: (args) => renderCheckboxInForm(args)
}

const renderCheckboxWithoutForm = (args: CheckboxArgs): string => {
  const { checked, variant, size, disabled, invalid, autofocus, required } = args

  const attrs: string[] = []

  if (variant) attrs.push(`variant="${variant}"`)
  if (size) attrs.push(`size="${size}"`)
  if (disabled) attrs.push('disabled')
  if (required) attrs.push('required')
  if (invalid) attrs.push('invalid')
  if (autofocus) attrs.push('autofocus')
  if (checked) attrs.push(`checked`)

  return `
        <label style="display: flex; gap: 0.5rem;">
            <ui-checkbox ${attrs.join(' ')}></ui-checkbox>
            <span>Do you agree to the terms?</span>
        </label>
  `
}

export const CheckboxWithoutForm: Story = {
  render: (args) => renderCheckboxWithoutForm(args)
}
