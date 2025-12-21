import { describe, expect, it } from 'vitest'

// Register the element
import '../src/renderer/src/components/ui/dialog'

function snapshotDialog(el: HTMLElement): string {
  const dialog = el as unknown as HTMLElement & { shadowRoot: ShadowRoot | null }
  const sr = dialog.shadowRoot
  if (!sr) return '<no-shadow-root />'

  // Snapshot only stable parts: the shadow DOM inner HTML and the host attributes.
  const attrs = Array.from(dialog.attributes)
    .map((a) => `${a.name}=${JSON.stringify(a.value)}`)
    .sort()
    .join(' ')

  const html = sr.innerHTML
    .replace(/\sdata-open(="")?/g, ' data-open')
    .replace(/\s+/g, ' ')
    .trim()

  return `<ui-dialog ${attrs}> ${html} </ui-dialog>`
}

function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0))
}

describe('ui-dialog', () => {
  it('renders closed by default (no base mounted)', () => {
    const el = document.createElement('ui-dialog')
    document.body.append(el)

    expect(snapshotDialog(el)).toMatchSnapshot()

    el.remove()
  })

  it('mounts template when opened and shows overlay/panel', async () => {
    const el = document.createElement('ui-dialog')

    // Add a trigger (slotted)
    const trigger = document.createElement('button')
    trigger.slot = 'trigger'
    trigger.textContent = 'Open'
    el.append(trigger)

    // Add content
    const header = document.createElement('div')
    header.slot = 'header'
    header.textContent = 'Header'
    el.append(header)

    const content = document.createElement('div')
    content.slot = 'content'
    content.innerHTML = `<input type="text" value="x" />`
    el.append(content)

    document.body.append(el)

    trigger.click()
    await flush()
    await flush()

    expect(el.hasAttribute('open')).toBe(true)
    expect(snapshotDialog(el)).toMatchSnapshot()

    el.remove()
  })

  it('closes via closeDialog and unmounts base', async () => {
    const el = document.createElement('ui-dialog') as unknown as HTMLElement & {
      openDialog?: () => void
      closeDialog?: () => void
    }

    document.body.append(el)

    el.openDialog?.()
    await flush()
    await flush()

    expect(el.hasAttribute('open')).toBe(true)

    el.closeDialog?.()
    // close plays exit animation and then removes open
    await flush()
    await flush()

    expect(el.hasAttribute('open')).toBe(false)
    expect(snapshotDialog(el)).toMatchSnapshot()

    el.remove()
  })
})
