/**
 * Simple global manager for applying `inert` to all body children except
 * a given host element while one or more overlays/dialogs are active.
 */
let activeInertCount = 0
const managedElements = new Set<HTMLElement>()

export function activateDocumentInertExcept(host: HTMLElement): void {
  if (typeof document === 'undefined') return

  activeInertCount += 1
  // Only apply inert on the transition from 0 -> 1.
  if (activeInertCount > 1) return

  const body = document.body
  const children = Array.from(body.children) as HTMLElement[]
  managedElements.clear()

  for (const el of children) {
    if (el === host) continue
    if (!el.hasAttribute('inert')) {
      el.setAttribute('inert', '')
      managedElements.add(el)
    }
  }
}

export function deactivateDocumentInert(): void {
  if (activeInertCount === 0) return
  activeInertCount -= 1

  // Only restore when the last active overlay/dialog is gone.
  if (activeInertCount > 0) return

  for (const el of managedElements) {
    if (el.hasAttribute('inert')) {
      el.removeAttribute('inert')
    }
  }
  managedElements.clear()
}
