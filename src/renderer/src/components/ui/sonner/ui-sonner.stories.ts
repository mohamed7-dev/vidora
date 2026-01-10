import type { Meta, StoryObj } from '@storybook/html'
import './ui-sonner'
import { SonnerVariant, UISonner } from './ui-sonner'
import { UiButton } from '../button/ui-button'

type SonnerArgs = {
  variant: SonnerVariant
  title: string
  description: string
  duration: number
}
const meta: Meta<SonnerArgs> = {
  title: 'UI/Sonner',
  args: {
    variant: 'default',
    title: 'Title',
    description: 'Description',
    duration: 5000
  },
  argTypes: {
    variant: { control: 'radio', options: ['default', 'destructive'] },
    title: { control: 'text' },
    description: { control: 'text' },
    duration: { control: 'number' }
  }
}

export default meta

type Story = StoryObj<SonnerArgs>

const renderSonner = (args: SonnerArgs): string => {
  const { variant, title, description, duration } = args

  const showSonner = (): void => {
    const sonner = document.querySelector('ui-sonner') as UISonner | null
    if (!sonner) return
    sonner.show({ variant, title, description, duration })
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('show-sonner-btn') as UiButton | null
    if (!btn) return
    btn.addEventListener('click', showSonner)
  })

  return `
    <ui-sonner></ui-sonner>
    <ui-button id="show-sonner-btn">
        <span>Show Sonner</span>
    </ui-button>
  `
}

export const Playground: Story = {
  render: (args) => renderSonner(args)
}
