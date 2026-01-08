export interface PortalLayer {
  /** Unique layer id (monotonic) */
  id: number
  /** Host element attached directly to document.body */
  host: HTMLDivElement
  /** Resolved z-index for this layer */
  zIndex: number
  /**
   * Destroy this layer.
   * Removes it from the DOM and the internal stack.
   */
  destroy: () => void
}

// Global layer stack and z-index bookkeeping.
// This ensures nested overlays never collide in z-order.
let nextLayerId = 1
let nextZIndex = 1000 // starting point; tweak if you need to stay above app chrome

const layers: PortalLayer[] = []

function allocateZIndex(): number {
  const z = nextZIndex
  nextZIndex += 1
  return z
}

function removeLayerFromStack(id: number): void {
  const index = layers.findIndex((layer) => layer.id === id)
  if (index !== -1) {
    layers.splice(index, 1)
  }
}

export interface CreatePortalOptions {
  /** Optional CSS class applied to the host element (in light DOM). */
  hostClassName?: string
  /**
   * Optional starting z-index base.
   * Only used for the very first created layer; subsequent layers always stack above.
   */
  baseZIndex?: number
}

/**
 * Creates a new portal layer rendered into light DOM attached to document.body.
 *
 * - Each call creates:
 *   - a light-DOM host appended to <body>
 *   - a container <div> inside that host where you can render your overlay
 * - The utility manages a global layer stack with monotonically increasing z-index
 *   so nested overlays never collide.
 */
export function createPortal(options: CreatePortalOptions = {}): PortalLayer | null {
  if (layers.length === 0 && typeof options.baseZIndex === 'number') {
    nextZIndex = options.baseZIndex
  }

  const id = nextLayerId++
  const zIndex = allocateZIndex()

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.inset = '0'
  // The host itself must receive pointer events so that composedPath()
  // includes dialog content when determining inside/outside clicks.
  host.style.pointerEvents = 'auto'
  host.style.zIndex = String(zIndex)
  host.setAttribute('data-portal-layer', String(id))

  if (options.hostClassName) {
    host.className = options.hostClassName
  }

  document.body.appendChild(host)

  const layer: PortalLayer = {
    id,
    host,
    zIndex,
    destroy: () => {
      removeLayerFromStack(id)
      if (host.parentNode) {
        host.parentNode.removeChild(host)
      }
    }
  }

  layers.push(layer)

  return layer
}

/**
 * Read-only snapshot of the current portal layers stack.
 * Top-most layer is the last item in the array.
 */
export function getPortalLayers(): readonly PortalLayer[] {
  return layers
}
