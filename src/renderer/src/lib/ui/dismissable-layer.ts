import type { CreatePortalOptions, PortalLayer } from './portal'
import { createPortal } from './portal'

/**
 * Public handle for a dismissible overlay layer.
 *
 * Wraps an underlying portal layer and exposes helpers to
 * query whether it is the top-most layer and to destroy it.
 */
export interface DismissibleLayer {
  /** Unique layer id (monotonic within this module). */
  id: number
  /** Host element for this layer (typically attached to document.body). */
  host: HTMLElement
  /** Underlying portal layer used for DOM + z-index. */
  portal: PortalLayer
  /** Whether this dismissible layer is currently the top-most one. */
  isTop: () => boolean
  /** Destroy this layer: removes it from the stack and DOM. */
  destroy: () => void
}

/**
 * Options used when creating a dismissible layer.
 *
 * Extends the generic portal options with dismissal-specific
 * behavior such as Escape handling and pointer-outside logic.
 */
export interface CreateDismissibleLayerOptions extends CreatePortalOptions {
  /** Called when this layer should be dismissed (Escape, pointer outside, etc.). */
  onDismiss: () => void
  /** If true, Escape will dismiss when this layer is topmost. Default: true. */
  dismissOnEscape?: boolean
  /** If true, pointer down outside will dismiss when this layer is topmost. Default: true. */
  dismissOnPointerDownOutside?: boolean
  /**
   * Custom logic to decide whether a pointer event is considered "inside" this layer.
   * If provided, it receives the PointerEvent and its composedPath, and should return true
   * when the event is inside interactive content that should NOT dismiss the layer.
   * If omitted, the default is to treat the portal container as the inside region.
   */
  isInside?: (event: PointerEvent, path: EventTarget[]) => boolean
  /**
   * Optional host element to use instead of creating a new portal layer.
   * When provided, no light-DOM portal host is created; dismissal semantics
   * (Escape / pointer-outside) are still managed for the given element.
   */
  hostElement?: HTMLElement
}

/**
 * Fully-resolved options used internally by the dismissible
 * stack once defaults have been applied.
 */
type NormalizedOptions = {
  onDismiss: () => void
  dismissOnEscape: boolean
  dismissOnPointerDownOutside: boolean
  isInside?: (event: PointerEvent, path: EventTarget[]) => boolean
}

/**
 * Internal representation of a dismissible layer in the
 * global stack, including its portal and normalized options.
 */
interface DismissibleLayerInternal {
  id: number
  portal: PortalLayer
  options: NormalizedOptions
}

let nextDismissibleId = 1
const dismissibleStack: DismissibleLayerInternal[] = []

let isKeydownListenerAttached = false
let isPointerListenerAttached = false

/** Returns the top-most dismissible layer in the stack, if any. */
function getTopLayer(): DismissibleLayerInternal | undefined {
  return dismissibleStack[dismissibleStack.length - 1]
}

/** Whether the given id corresponds to the top-most layer. */
function isTop(id: number): boolean {
  const top = getTopLayer()
  return !!top && top.id === id
}

/** Remove a layer from the stack by id, if present. */
function removeById(id: number): void {
  const index = dismissibleStack.findIndex((layer) => layer.id === id)
  if (index !== -1) {
    dismissibleStack.splice(index, 1)
  }
}

/**
 * Lazily attach a global keydown listener to handle Escape dismissal
 * for the top-most layer.
 */
function ensureGlobalKeydownListener(): void {
  if (isKeydownListenerAttached || typeof window === 'undefined') return

  const handler = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return

    const top = getTopLayer()
    if (!top || !top.options.dismissOnEscape) return

    event.preventDefault()
    event.stopPropagation()
    top.options.onDismiss()
  }

  window.addEventListener('keydown', handler, true)
  isKeydownListenerAttached = true
}

/**
 * Lazily attach a global pointerdown listener to handle
 * pointer-outside dismissal for the top-most layer.
 */
function ensureGlobalPointerListener(): void {
  if (isPointerListenerAttached || typeof document === 'undefined') return

  const handler = (event: PointerEvent): void => {
    const top = getTopLayer()
    if (!top || !top.options.dismissOnPointerDownOutside) return

    const path = (event.composedPath ? event.composedPath() : []) as EventTarget[]
    const host = top.portal.host

    const inside = top.options.isInside ? top.options.isInside(event, path) : path.includes(host)

    if (!inside) {
      top.options.onDismiss()
    }
  }

  document.addEventListener('pointerdown', handler, true)
  isPointerListenerAttached = true
}

/**
 * Create a new dismissible layer and push it onto the global stack.
 *
 * The returned object can be used to query whether it is top-most
 * and to destroy it when no longer needed.
 */
export function createDismissibleLayer(
  options: CreateDismissibleLayerOptions
): DismissibleLayer | null {
  const portalOptions: CreatePortalOptions = {
    hostClassName: options.hostClassName,
    baseZIndex: options.baseZIndex
  }

  // When a hostElement is provided, operate directly on that element instead
  // of creating a separate light-DOM portal. This allows callers (such as
  // dialogs that render in-place) to still use the global dismissible stack
  // without incurring an extra portal host.
  let portal: PortalLayer

  if (options.hostElement) {
    portal = {
      id: -1,
      host: options.hostElement as HTMLDivElement,
      zIndex: 0,
      // No-op destroy: the caller owns the hostElement's lifecycle.
      destroy: () => {
        /* no-op */
      }
    }
  } else {
    const created = createPortal(portalOptions)
    if (!created) return null
    portal = created
  }

  const id = nextDismissibleId++

  const normalized: NormalizedOptions = {
    onDismiss: options.onDismiss,
    dismissOnEscape: options.dismissOnEscape ?? true,
    dismissOnPointerDownOutside: options.dismissOnPointerDownOutside ?? true,
    isInside: options.isInside
  }

  const internal: DismissibleLayerInternal = {
    id,
    portal,
    options: normalized
  }

  dismissibleStack.push(internal)

  ensureGlobalKeydownListener()
  ensureGlobalPointerListener()

  const destroy = (): void => {
    removeById(id)
    portal.destroy()
  }

  return {
    id,
    host: portal.host,
    portal,
    isTop: () => isTop(id),
    destroy
  }
}

/** Read-only view of the current dismissible stack (top-most is last). */
export function getDismissibleLayers(): readonly DismissibleLayerInternal[] {
  return dismissibleStack
}
