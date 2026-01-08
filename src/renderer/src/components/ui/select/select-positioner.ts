export type SelectAlign = 'start' | 'center' | 'end'

export interface SelectPositionOptions {
  trigger: HTMLElement
  menu: HTMLElement
  align: SelectAlign
  offset: number
}

/**
 * Position a select menu relative to its trigger using fixed positioning and
 * handle basic collision with the viewport edges.
 */
export function positionSelectMenu(options: SelectPositionOptions): void {
  const { trigger, menu, align, offset } = options

  const triggerRect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Ensure the menu has been measured at least once.
  const menuRect = menu.getBoundingClientRect()
  const menuWidth = menuRect.width || menu.offsetWidth || 0
  const menuHeight = menuRect.height || menu.offsetHeight || 0

  const style = menu.style
  style.position = 'fixed'

  // -------- Vertical positioning --------
  // Prefer below the trigger.
  let top = triggerRect.bottom + offset

  // If it would overflow below the viewport, try placing it above.
  if (top + menuHeight > viewportHeight) {
    const aboveTop = triggerRect.top - offset - menuHeight
    if (aboveTop >= 0) {
      top = aboveTop
    }
  }

  // Clamp within viewport.
  top = Math.max(0, Math.min(top, Math.max(0, viewportHeight - menuHeight)))
  style.top = `${top}px`

  // -------- Horizontal positioning --------
  let left: number

  if (align === 'center') {
    left = triggerRect.left + triggerRect.width / 2 - menuWidth / 2
  } else if (align === 'end') {
    left = triggerRect.right - menuWidth
  } else {
    // "start" or anything unrecognized: align left edges.
    left = triggerRect.left
  }

  // Clamp horizontally within viewport.
  left = Math.max(0, Math.min(left, Math.max(0, viewportWidth - menuWidth)))

  style.left = `${left}px`
  style.transform = ''
}
