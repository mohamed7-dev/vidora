/**
 * Returns true when `element` is inside `container` in the *composed tree*.
 * This accounts for slotting and shadow DOM boundaries.
 */
export function isComposedTreeDescendant(
  container: HTMLElement,
  element: HTMLElement | null
): boolean {
  if (!element) return false
  let node: Node | null = element
  // Traverse via:
  // - regular DOM parents
  // - assignedSlot for slotted nodes
  // - ShadowRoot.host when crossing shadow boundary
  while (node) {
    if (node === container) return true
    if (node instanceof HTMLElement && node.assignedSlot) {
      node = node.assignedSlot
      continue
    }
    const parent = node.parentNode as Node | null
    if (parent) {
      node = parent
      continue
    }
    const root = node.getRootNode?.() as Node | undefined
    if (root && root instanceof ShadowRoot) {
      node = root.host
      continue
    }
    node = null
  }
  return false
}

type FocusableTarget = HTMLElement | { focus(): void }

/**
 * Focus an element and optionally select it
 */
export function focus(element?: FocusableTarget | null, { select = false } = {}): undefined {
  if (element && element.focus) {
    const previouslyFocusedElement = document.activeElement

    element.focus({ preventScroll: true })
    // only select if its not the same element, it supports selection and we need to select
    if (element !== previouslyFocusedElement && isSelectableInput(element) && select)
      element.select()
  }
}

function isSelectableInput(element): element is FocusableTarget & { select: () => void } {
  return element instanceof HTMLInputElement && 'select' in element
}

export function removeLinks(items: HTMLElement[]): HTMLElement[] {
  return items.filter((item) => item.tagName !== 'A')
}

// ________________________________FocusScope_____________________________________________
type FocusScopeAPI = { paused: boolean; pause(): void; resume(): void }

// this stack keeps tracing of all focus scopes with active one being on top of the stack
// this is useful for nested scopes e.g. dialog that triggers another dialog
export const focusScopesStack = createFocusScopesStack()

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createFocusScopesStack() {
  let stack: FocusScopeAPI[] = []

  return {
    add(focusScope: FocusScopeAPI) {
      // pause the currently active focus scope (at the top of the stack)
      const activeFocusScope = stack[0]
      if (focusScope !== activeFocusScope) {
        activeFocusScope?.pause()
      }
      // remove in case it already exists (because we'll re-add it at the top of the stack)
      stack = arrayRemove(stack, focusScope)
      stack.unshift(focusScope)
    },

    remove(focusScope: FocusScopeAPI) {
      stack = arrayRemove(stack, focusScope)
      stack[0]?.resume()
    }
  }
}

function arrayRemove<T>(array: T[], item: T): T[] {
  const updatedArray = [...array]
  const index = updatedArray.indexOf(item)
  if (index !== -1) {
    updatedArray.splice(index, 1)
  }
  return updatedArray
}

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

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
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
  let paused = false
  let lastFocused: HTMLElement | null = null
  let previouslyFocused: HTMLElement | null = null

  const scope: FocusScopeAPI = {
    paused,
    pause() {
      paused = true
      this.paused = true
    },
    resume() {
      paused = false
      this.paused = false
    }
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!active || paused) return
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
    if (!active || paused) return

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
    if (!active || paused) return

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

    // Register this trap with the global focus scope stack so that
    // only the top-most trap is active at a time. This enables
    // layering (e.g. a select inside a dialog) without competing
    // key/focus handlers.
    focusScopesStack.add(scope)

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

    focusScopesStack.remove(scope)

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
