export type DismissSource = 'keyboard' | 'overlay'

export type DismissableLayerOptions = {
  enabled?: boolean
  onDismiss: (source: DismissSource, event: Event) => void
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
  isDismissable?: () => boolean
}

export type DismissableLayerHandle = {
  activate(): void
  deactivate(): void
  destroy(): void
}

export function createDismissableLayer(
  overlayEl: HTMLElement | null,
  options: DismissableLayerOptions
): DismissableLayerHandle {
  const {
    enabled = true,
    onDismiss,
    closeOnEscape = true,
    closeOnOverlayClick = true,
    isDismissable
  } = options

  let active = false

  const canDismiss = (): boolean => {
    if (!enabled) return false
    if (isDismissable) return isDismissable()
    return true
  }

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (!active) return
    if (!closeOnEscape) return
    if (ev.key !== 'Escape') return
    if (!canDismiss()) return
    ev.stopPropagation()
    onDismiss('keyboard', ev)
  }

  const onOverlayClick = (ev: MouseEvent): void => {
    if (!active) return
    if (!closeOnOverlayClick) return
    if (!canDismiss()) return
    onDismiss('overlay', ev)
  }

  const activate = (): void => {
    if (active) return
    active = true
    document.addEventListener('keydown', onKeyDown)
    overlayEl?.addEventListener('click', onOverlayClick)
  }

  const deactivate = (): void => {
    if (!active) return
    active = false
    document.removeEventListener('keydown', onKeyDown)
    overlayEl?.removeEventListener('click', onOverlayClick)
  }

  const destroy = (): void => {
    deactivate()
  }

  return { activate, deactivate, destroy }
}
