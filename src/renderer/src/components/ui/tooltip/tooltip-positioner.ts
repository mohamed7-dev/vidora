export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

export type TooltipAlign = 'start' | 'center' | 'end'

export interface TooltipPositionOptions {
  trigger: HTMLElement
  content: HTMLElement
  side: TooltipSide
  align: TooltipAlign
  offset: number
}

/**
 * Position a tooltip panel relative to its trigger using fixed positioning and
 * handle basic collision with the viewport edges.
 */
export class TooltipPositioner {
  static position(options: TooltipPositionOptions): void {
    const { trigger, content, side, align, offset } = options

    const triggerRect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Ensure the content has been measured at least once.
    const contentRect = content.getBoundingClientRect()
    const contentWidth = contentRect.width || content.offsetWidth || 0
    const contentHeight = contentRect.height || content.offsetHeight || 0

    const style = content.style
    style.position = 'fixed'

    let top = triggerRect.top
    let left = triggerRect.left

    // Primary side offset: place tooltip fully outside trigger by offset.
    if (side === 'top') {
      top = triggerRect.top - offset - contentHeight
    } else if (side === 'bottom') {
      top = triggerRect.bottom + offset
    } else if (side === 'left') {
      left = triggerRect.left - offset - contentWidth
    } else if (side === 'right') {
      left = triggerRect.right + offset
    }

    // Align along the orthogonal axis.
    if (side === 'top' || side === 'bottom') {
      // Horizontal alignment
      if (align === 'start') {
        left = triggerRect.left
      } else if (align === 'end') {
        left = triggerRect.right - contentWidth
      } else {
        // center
        left = triggerRect.left + triggerRect.width / 2 - contentWidth / 2
      }
    } else {
      // Vertical alignment for left/right
      if (align === 'start') {
        top = triggerRect.top
      } else if (align === 'end') {
        top = triggerRect.bottom - contentHeight
      } else {
        // center
        top = triggerRect.top + triggerRect.height / 2 - contentHeight / 2
      }
    }

    // Clamp within viewport.
    top = Math.max(0, Math.min(top, Math.max(0, viewportHeight - contentHeight)))
    left = Math.max(0, Math.min(left, Math.max(0, viewportWidth - contentWidth)))

    style.top = `${top}px`
    style.left = `${left}px`
    style.transform = ''
  }
}
