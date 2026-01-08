export function ensureComponentWithRegistry<T extends HTMLElement>(
  componentTreeRoot: HTMLElement,
  componentTag: string,
  targetTagName: string,
  targetIdAttrName: string,
  registry: Map<string, T>,
  options?: { shouldThrow: boolean }
): T | null {
  // Walk the composed tree upwards from the given component, crossing
  // shadow DOM boundaries and honoring any portal hosts tagged with
  // an instance id so portaled content can still resolve its owning
  // component.
  let node: Node | null = componentTreeRoot

  while (true) {
    if (!node) break

    if (node instanceof HTMLElement) {
      if (node.tagName.toLowerCase() === targetTagName.toLowerCase()) {
        return node as T
      }

      const instanceIdAttr = node.getAttribute(targetIdAttrName)
      if (instanceIdAttr != null) {
        const target = registry.get(instanceIdAttr)
        if (target) return target
      }
    }

    const parent = node.parentNode as Node | null
    if (parent) {
      node = parent
      continue
    }

    const root = ((): Document | ShadowRoot | null => {
      const anyNode = node
      if (typeof anyNode.getRootNode === 'function') {
        return anyNode.getRootNode() as Document | ShadowRoot
      }
      return null
    })()

    if (root && root instanceof ShadowRoot) {
      node = root.host
      continue
    }

    node = null
  }

  if (!options?.shouldThrow) return null
  throw new Error(`Make sure <${componentTag}> is a child of <${targetTagName}>.`)
}

export function createTemplateFromHtml(html: string): HTMLTemplateElement {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const inner = doc.querySelector('template')

  // Always return a template owned by the current document.
  const t = document.createElement('template')
  t.innerHTML = inner ? inner.innerHTML : html
  return t
}

export function createStyleSheetFromStyle(style: string): CSSStyleSheet {
  const s = new CSSStyleSheet()
  s.replaceSync(style)
  return s
}
