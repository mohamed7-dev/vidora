export type Cleanup = () => void

type BindOptions = {
  /** include nodes assigned to nested slots */
  flatten?: boolean
}

function on(el: EventTarget, type: string, handler: EventListenerOrEventListenerObject): Cleanup {
  el.addEventListener(type, handler)
  return () => el.removeEventListener(type, handler)
}

/**
 * Binds a click handler to the first element assigned to a slot.
 * Rebinds automatically on slotchange.
 */
export function bindSlotFirstAssignedClick(
  slot: HTMLSlotElement | null,
  handler: (el: HTMLElement, ev: Event) => void,
  options: BindOptions = {}
): Cleanup {
  if (!slot) return () => undefined

  const { flatten = true } = options
  let unbindClick: Cleanup | null = null

  const bind = (): void => {
    unbindClick?.()
    unbindClick = null

    const nodes = slot.assignedElements({ flatten })
    const el = (nodes[0] as HTMLElement | undefined) ?? undefined
    if (!el) return

    const onClick = (ev: Event): void => handler(el, ev)
    el.addEventListener('click', onClick)
    unbindClick = () => el.removeEventListener('click', onClick)
  }

  bind()
  const offSlot = on(slot, 'slotchange', bind)

  return () => {
    offSlot()
    unbindClick?.()
    unbindClick = null
  }
}

/**
 * Binds click handlers to all elements matching `selector` within each assigned element.
 * Rebinds automatically on slotchange.
 */
export function bindSlotAssignedDescendantClicks(
  slot: HTMLSlotElement | null,
  selector: string,
  handler: (el: HTMLElement, ev: Event) => void,
  options: BindOptions = {}
): Cleanup {
  if (!slot) return () => undefined

  const { flatten = true } = options
  let unbinds: Cleanup[] = []

  const bind = (): void => {
    for (const u of unbinds) u()
    unbinds = []

    const roots = slot.assignedElements({ flatten })
    for (const r of roots) {
      const root = r as HTMLElement
      const els = Array.from(root.querySelectorAll(selector)) as HTMLElement[]
      for (const el of els) {
        const onClick = (ev: Event): void => handler(el, ev)
        el.addEventListener('click', onClick)
        unbinds.push(() => el.removeEventListener('click', onClick))
      }
    }
  }

  bind()
  const offSlot = on(slot, 'slotchange', bind)

  return () => {
    offSlot()
    for (const u of unbinds) u()
    unbinds = []
  }
}
