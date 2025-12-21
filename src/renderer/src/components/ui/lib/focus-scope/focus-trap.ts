import { focus, isComposedTreeDescendant, removeLinks } from './utils'

export type FocusTrapOptions = {
  loop?: boolean
  initialFocus?: HTMLElement | null | (() => HTMLElement | null)
  restoreFocus?: HTMLElement | null | (() => HTMLElement | null)
}

export type FocusTrapHandle = {
  activate(): void
  deactivate(): void
  destroy(): void
}

function resolveEl(value: FocusTrapOptions['initialFocus']): HTMLElement | null {
  if (!value) return null
  return typeof value === 'function' ? value() : value
}

function getDeepActiveElement(): HTMLElement | null {
  let el = document.activeElement as HTMLElement | null
  while (el) {
    const sr = el.shadowRoot
    const inner = (sr?.activeElement as HTMLElement | null) ?? null
    if (!inner || inner === el) break
    el = inner
  }
  return el
}

const FOCUSABLE_SELECTOR =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),' +
  'select:not([disabled]),textarea:not([disabled]),iframe,object,embed,summary,' +
  '[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"])'

function isElementVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  // offsetParent is unreliable for elements inside shadow DOM / custom elements.
  // getClientRects() is a better signal of actual render boxes.
  if (el.getClientRects().length === 0 && style.position !== 'fixed') return false
  return true
}

function isActuallyFocusable(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  if ('disabled' in el && (el as HTMLButtonElement).disabled) return false

  if (el.getAttribute('aria-disabled') === 'true') return false

  if ('inert' in el && (el as unknown as { inert: boolean }).inert) return false

  return isElementVisible(el)
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes: HTMLElement[] = []
  const visited = new WeakSet<Node>()

  const visit = (node: Node): void => {
    if (visited.has(node)) return
    visited.add(node)

    if (node instanceof HTMLElement) {
      if (node.matches(FOCUSABLE_SELECTOR) && isActuallyFocusable(node)) {
        nodes.push(node)
      }

      // Traverse open shadow root, if any.
      const sr = node.shadowRoot
      if (sr) visit(sr)

      // Traverse slotted light DOM.
      if (node instanceof HTMLSlotElement) {
        const assigned = node.assignedElements({ flatten: true })
        for (const el of assigned) visit(el)
      }
    }

    // Traverse DOM children.
    if (node instanceof ShadowRoot || node instanceof DocumentFragment) {
      for (const child of Array.from(node.childNodes)) visit(child)
    } else if (node instanceof Element) {
      for (const child of Array.from(node.children)) visit(child)
    }
  }

  visit(container)
  return nodes
}

function getTabbableEdges(container: HTMLElement): [HTMLElement | null, HTMLElement | null] {
  const candidates = getFocusableElements(container)
  // const candidates = removeLinks(all)
  const first = candidates[0] ?? null
  const last = candidates.length > 0 ? candidates[candidates.length - 1] : null
  return [first, last]
}

export function createFocusTrap(
  container: HTMLElement,
  options: FocusTrapOptions = {}
): FocusTrapHandle {
  const { loop = true } = options
  let active = false
  let lastFocused: HTMLElement | null = null
  let previouslyFocused: HTMLElement | null = null

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!active) return
    if (!loop) return

    const isTab = e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey
    if (!isTab) return

    const activeEl = getDeepActiveElement()
    if (!activeEl) return

    const [first, last] = getTabbableEdges(container)
    if (!first || !last) return

    const isOnLast = activeEl === last || isComposedTreeDescendant(last, activeEl)
    const isOnFirst = activeEl === first || isComposedTreeDescendant(first, activeEl)

    if (!e.shiftKey && isOnLast) {
      e.preventDefault()
      e.stopPropagation()
      focus(first, { select: true })
    } else if (e.shiftKey && isOnFirst) {
      e.preventDefault()
      e.stopPropagation()
      focus(last, { select: true })
    }
  }

  const onFocusIn = (e: FocusEvent): void => {
    if (!active) return

    const target = e.target as HTMLElement | null
    if (!target) return

    if (isComposedTreeDescendant(container, target)) {
      lastFocused = target
      return
    }

    const fallback =
      lastFocused && isComposedTreeDescendant(container, lastFocused) ? lastFocused : container
    focus(fallback, { select: true })
  }

  const onFocusOut = (e: FocusEvent): void => {
    if (!active) return

    const next = e.relatedTarget as HTMLElement | null
    if (!next) return

    if (!isComposedTreeDescendant(container, next)) {
      const fallback =
        lastFocused && isComposedTreeDescendant(container, lastFocused) ? lastFocused : container
      focus(fallback, { select: true })
    }
  }

  const mutationObserver = new MutationObserver((mutations: MutationRecord[]) => {
    if (!active) return
    const focusedElement = document.activeElement as HTMLElement | null
    if (focusedElement === document.body) {
      for (const m of mutations) {
        if (m.removedNodes.length > 0) {
          focus(container)
          break
        }
      }
    }
  })

  const activate = (): void => {
    if (active) return
    active = true

    previouslyFocused = document.activeElement as HTMLElement | null

    // Default fallback.
    lastFocused = container

    // Trap events.
    container.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    mutationObserver.observe(container, { childList: true, subtree: true })

    // Initial focus.
    const explicit = resolveEl(options.initialFocus)
    if (explicit) {
      focus(explicit, { select: true })
    } else {
      const candidates = removeLinks(getFocusableElements(container))
      if (candidates.length > 0) {
        focus(candidates[0], { select: true })
      } else {
        focus(container)
      }
    }
  }

  const deactivate = (): void => {
    if (!active) return
    active = false

    container.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    mutationObserver.disconnect()

    const restore = resolveEl(options.restoreFocus) ?? previouslyFocused
    if (restore) {
      focus(restore, { select: true })
    }
  }

  const destroy = (): void => {
    deactivate()
    lastFocused = null
    previouslyFocused = null
  }

  return { activate, deactivate, destroy }
}
