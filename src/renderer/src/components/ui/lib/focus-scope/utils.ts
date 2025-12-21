/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @description
 * Get first and last tabbable elements in the list
 */
export function getTabbableEdges(container: HTMLElement): Array<HTMLElement | undefined> {
  const activeElements = getActiveElementsInContainer(container)
  const firstEl = findVisible(activeElements, container)
  const lastEl = findVisible(activeElements.reverse(), container)
  return [firstEl, lastEl] as const
}

/**
 * @description
 * Get list of all active elements that can be tabbed into
 */
export function getActiveElementsInContainer(container: HTMLElement): HTMLElement[] {
  const nodes: HTMLElement[] = []
  const visited = new WeakSet<Node>()

  const visit = (node: Node): void => {
    if (visited.has(node)) return
    visited.add(node)

    if (node instanceof HTMLElement) {
      // Note: visibility filtering is done in findVisible(); here we focus on “can be tabbed into”.
      // Skip disabled/hidden inputs.
      const anyNode = node as any
      if (
        anyNode.disabled ||
        anyNode.hidden ||
        (node.tagName === 'INPUT' && (node as HTMLInputElement).type === 'hidden')
      ) {
        // still traverse children because disabled parents can contain enabled children (e.g. wrappers)
      } else if (node.tabIndex >= 0) {
        nodes.push(node)
      }

      // Traverse open shadow root, if any.
      const sr = node.shadowRoot
      if (sr) visit(sr)

      // Traverse slotted light-DOM.
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
    const parent = (node as any).parentNode as Node | null
    if (parent) {
      node = parent
      continue
    }
    const root = (node as any).getRootNode?.() as Node | undefined
    if (root && root instanceof ShadowRoot) {
      node = root.host
      continue
    }
    node = null
  }
  return false
}

/**
 * @description
 * find the first visible element in a list
 */
function findVisible(elements: HTMLElement[], container: HTMLElement): HTMLElement | undefined {
  for (const element of elements) {
    if (!isHidden(element, { upTo: container })) return element
  }

  return undefined
}

function isHidden(element: HTMLElement, { upTo }: { upTo: HTMLElement }): boolean {
  if (getComputedStyle(element).visibility === 'hidden') return true

  while (element) {
    // we stop at upTo, and return false which indicates that the element is visible
    if (upTo !== undefined && element === upTo) return false
    if (getComputedStyle(element).display === 'none') return true
    element = element.parentElement as HTMLElement
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

function isSelectableInput(element: any): element is FocusableTarget & { select: () => void } {
  return element instanceof HTMLInputElement && 'select' in element
}

export function removeLinks(items: HTMLElement[]): HTMLElement[] {
  return items.filter((item) => item.tagName !== 'A')
}

/**
 * Attempts focusing the first element in a list of candidates.
 * Stops when focus has actually moved.
 */
export function focusFirst(candidates: HTMLElement[], { select = false } = {}): undefined {
  const previouslyFocusedElement = document.activeElement
  for (const candidate of candidates) {
    focus(candidate, { select })
    // loop will be broken when at least one of the candidates gets focused
    if (document.activeElement !== previouslyFocusedElement) return
  }
}

// ________________________________FocusScope_____________________________________________
type FocusScopeAPI = { paused: boolean; pause(): void; resume(): void }

// this stack keeps tracing of all focus scopes with active one being on top of the stack
// this is useful for nested scopes e.g. dialog that triggers another dialog
export const focusScopesStack = createFocusScopesStack()

function createFocusScopesStack(): any {
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
