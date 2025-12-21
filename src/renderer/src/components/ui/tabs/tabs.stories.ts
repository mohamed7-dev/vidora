import type { Meta, StoryObj } from '@storybook/html'
import './index'

type TabsArgs = {
  value: string
}

const meta: Meta<TabsArgs> = {
  title: 'UI/Tabs',
  args: {
    value: 'tab1'
  },
  argTypes: {
    value: { control: 'text' }
  }
}

export default meta

type Story = StoryObj<TabsArgs>

const renderTabs = (args: TabsArgs): string => {
  const { value } = args

  const attrs: string[] = []

  if (value) attrs.push(`value="${value}"`)

  return `
    <ui-tabs ${attrs.join(' ')}>
      <ui-button value="tab1" slot="tab" variant="outline"  block>
        <span slot="label">Tab 1</span>
      </ui-button>
      <ui-button value="tab2" slot="tab" variant="outline"  block>
        <span slot="label">Tab 2</span>
      </ui-button>
      <div slot="panel" value="tab1">
        <p>Content of Tab 1</p>
      </div>
      <div slot="panel" value="tab2">
        <p>Content of Tab 2</p>
      </div>
    </ui-tabs>
  `
}

export const Playground: Story = {
  render: (args) => renderTabs(args)
}
