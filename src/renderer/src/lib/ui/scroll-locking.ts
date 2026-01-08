export type ScrollLockRelease = () => void

let lockCount = 0
let originalOverflow: string | null = null

/**
 * Acquire a global scroll lock on the document body.
 *
 * Multiple components can call this; scrolling will be disabled on the first
 * acquisition and re-enabled only after the last release is called.
 */
export function acquireScrollLock(): ScrollLockRelease {
  const body = document.body

  if (lockCount === 0) {
    originalOverflow = body.style.overflow || null
    body.style.overflow = 'hidden'
  }

  lockCount += 1
  let released = false

  return () => {
    if (released) return
    released = true

    lockCount -= 1
    if (lockCount <= 0) {
      lockCount = 0
      if (body) {
        if (originalOverflow !== null) {
          body.style.overflow = originalOverflow
        } else {
          body.style.removeProperty('overflow')
        }
      }
      originalOverflow = null
    }
  }
}
