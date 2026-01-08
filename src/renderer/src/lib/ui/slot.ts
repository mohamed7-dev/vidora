export interface AsChildConfig {
  /** Attribute name used to enable as-child behavior. Default: "as-child". */
  asChildAttr?: string
  /** If true, require exactly one slotted element when as-child is enabled. */
  requireSingleChild?: boolean
}

/**
 * Resolve the effective target element for a host that supports an
 * `as-child` pattern. If the host has the as-child attribute and
 * a slotted child exists, that child becomes the target; otherwise
 * the host itself is used.
 */
export function resolveAsChildTarget(host: HTMLElement, config: AsChildConfig = {}): HTMLElement {
  const attrName = config.asChildAttr ?? 'as-child'
  const requireSingleChild = config.requireSingleChild ?? false

  if (!host.hasAttribute(attrName)) {
    return host
  }

  const slot = host.shadowRoot?.querySelector('slot')
  const assigned = (slot?.assignedElements({ flatten: true }) ?? []) as HTMLElement[]

  if (requireSingleChild && import.meta.env && import.meta.env.DEV) {
    if (assigned.length !== 1) {
      throw new Error(
        `${host.tagName.toLowerCase()}: as-child requires exactly one slotted child element.`
      )
    }
  }

  return assigned[0] ?? host
}

export interface MergeAttributesOptions {
  /** Attributes that should not be copied from host to target. */
  exclude?: string[]
  /** If true, remove merged attributes from the host after copying. */
  clearFromHost?: boolean
}

/**
 * Merge attributes from a host element onto a target element, giving
 * precedence to attributes already defined on the target.
 */
export function mergeHostAttributesToTarget(
  host: HTMLElement,
  target: HTMLElement,
  options: MergeAttributesOptions = {}
): void {
  if (host === target) return

  const exclude = new Set(options.exclude ?? [])
  const clearFromHost = options.clearFromHost ?? false

  const hostAttributes = Array.from(host.attributes)

  for (const attr of hostAttributes) {
    if (exclude.has(attr.name)) continue
    // Merge classes: combine host + target classes without duplicates.
    if (attr.name === 'class') {
      const hostClasses = attr.value.split(/\s+/).filter(Boolean)
      for (const cls of hostClasses) {
        if (!target.classList.contains(cls)) {
          target.classList.add(cls)
        }
      }
      continue
    }

    // Merge inline styles: copy any properties from host that the
    // target has not explicitly set. Child (target) styles win.
    if (attr.name === 'style') {
      const hostStyle = (host.getAttribute('style') ?? '')
        .split(';')
        .map((chunk) => chunk.trim())
        .filter(Boolean)

      for (const decl of hostStyle) {
        const [rawProp, ...rest] = decl.split(':')
        if (!rawProp || rest.length === 0) continue
        const prop = rawProp.trim()
        const value = rest.join(':').trim()
        if (!prop || !value) continue

        if (!target.style.getPropertyValue(prop)) {
          target.style.setProperty(prop, value)
        }
      }
      continue
    }

    // For all other attributes, only copy if the target does not
    // already define them, giving precedence to the child.
    if (!target.hasAttribute(attr.name)) {
      target.setAttribute(attr.name, attr.value)
    }
  }

  if (clearFromHost) {
    for (const attr of hostAttributes) {
      if (exclude.has(attr.name)) continue
      host.removeAttribute(attr.name)
    }
  }
}
