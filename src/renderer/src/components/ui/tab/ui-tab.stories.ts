import type { Meta, StoryObj } from '@storybook/html'
import './ui-tab'
import './ui-tab-content'
import './ui-tab-trigger'
import './ui-tab-list'

type TabsArgs = {
  value: string
  disabled: string
}

const meta: Meta<TabsArgs> = {
  title: 'UI/Tabs',
  args: {
    value: 'tab1'
  },
  argTypes: {
    value: { control: 'select', options: ['tab1', 'tab2'] },
    disabled: { control: 'select', options: ['tab1', 'tab2'] }
  }
}

export default meta

type Story = StoryObj<TabsArgs>

const renderTabWithNoSlottedTriggers = (args: TabsArgs): string => {
  const { value, disabled } = args

  const attrs: string[] = []

  if (value) attrs.push(`value="${value}"`)

  return `
    <ui-tab ${attrs.join(' ')}>
        <ui-tab-list>
            <ui-tab-trigger ${disabled === 'tab1' ? 'disabled' : ''} value="tab1">
                <span>Tab 1</span>
            </ui-tab-trigger>
            <ui-tab-trigger ${disabled === 'tab2' ? 'disabled' : ''} value="tab2">
                <span>Tab 2</span>
            </ui-tab-trigger>
        </ui-tab-list>
        <ui-tab-content value="tab1">
            <p>Content of Tab 1</p>
        </ui-tab-content>
        <ui-tab-content value="tab2">
            <p>Content of Tab 2</p>
        </ui-tab-content>
    </ui-tab>
  `
}

const renderTabWithSlottedTriggers = (args: TabsArgs): string => {
  const { value, disabled } = args

  const attrs: string[] = []

  if (value) attrs.push(`value="${value}"`)

  return `
    <ui-tab ${attrs.join(' ')}>
        <ui-tab-list>
            <ui-tab-trigger ${disabled === 'tab1' ? 'disabled' : ''} value="tab1" as-child>
                <ui-button variant="destructive" block>
                    <span>Tab 1</span>
                </ui-button>
            </ui-tab-trigger>
            <ui-tab-trigger ${disabled === 'tab2' ? 'disabled' : ''} value="tab2" as-child>
                <ui-button variant="destructive" block>
                    <span>Tab 2</span>
                </ui-button>
            </ui-tab-trigger>
        </ui-tab-list>
        <ui-tab-content value="tab1">
            <p>Content of Tab 1</p>
        </ui-tab-content>
        <ui-tab-content value="tab2">
            <p>Content of Tab 2</p>
        </ui-tab-content>
    </ui-tab>
  `
}

export const TabWithNoSlottedTriggers: Story = {
  render: (args) => renderTabWithNoSlottedTriggers(args)
}

export const TabWithSlottedTriggers: Story = {
  render: (args) => renderTabWithSlottedTriggers(args)
}
