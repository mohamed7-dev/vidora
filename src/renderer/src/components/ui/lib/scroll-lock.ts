export type ScrollLockHandle = {
  lock(): void
  unlock(): void
  destroy(): void
}

export function createScrollLock(target: HTMLElement = document.body): ScrollLockHandle {
  let locked = false
  let prevOverflow: string | null = null

  const lock = (): void => {
    if (locked) return
    locked = true
    prevOverflow = target.style.overflow
    target.style.overflow = 'hidden'
  }

  const unlock = (): void => {
    if (!locked) return
    locked = false
    target.style.overflow = prevOverflow ?? ''
    prevOverflow = null
  }

  const destroy = (): void => {
    unlock()
  }

  return { lock, unlock, destroy }
}
