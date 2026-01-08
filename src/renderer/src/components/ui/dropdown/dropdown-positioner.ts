export type DropdownAlign = 'start' | 'center' | 'end'

export interface DropdownPositionOptions {
  trigger: HTMLElement
  menu: HTMLElement
  align: DropdownAlign
  offset: number
}

/**
 * Position a dropdown menu relative to its trigger using fixed positioning and
 * handle basic collision with the viewport edges.
 */
export function positionDropdownMenu(options: DropdownPositionOptions): void {
  const { trigger, menu, align, offset } = options

  const triggerRect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const menuRect = menu.getBoundingClientRect()
  const menuWidth = menuRect.width || menu.offsetWidth || 0
  const menuHeight = menuRect.height || menu.offsetHeight || 0

  const style = menu.style
  style.position = 'fixed'

  // Vertical: prefer below the trigger.
  let top = triggerRect.bottom + offset
  if (top + menuHeight > viewportHeight) {
    const aboveTop = triggerRect.top - offset - menuHeight
    if (aboveTop >= 0) {
      top = aboveTop
    }
  }
  top = Math.max(0, Math.min(top, Math.max(0, viewportHeight - menuHeight)))
  style.top = `${top}px`

  // Horizontal alignment.
  let left: number
  if (align === 'center') {
    left = triggerRect.left + triggerRect.width / 2 - menuWidth / 2
  } else if (align === 'end') {
    left = triggerRect.right - menuWidth
  } else {
    left = triggerRect.left
  }

  left = Math.max(0, Math.min(left, Math.max(0, viewportWidth - menuWidth)))
  style.left = `${left}px`
  style.transform = ''
}
