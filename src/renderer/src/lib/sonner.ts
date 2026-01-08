import { UISonner } from '@ui/sonner/ui-sonner'

let sonnerInstance: UISonner | null = null

function getSonner(): UISonner | null {
  if (sonnerInstance) return sonnerInstance

  const existing = document.querySelector('ui-sonner') as UISonner | null
  if (existing) {
    sonnerInstance = existing
    return sonnerInstance
  }

  const el = document.createElement('ui-sonner') as UISonner
  document.body.appendChild(el)
  sonnerInstance = el
  return sonnerInstance
}

export const toast = {
  show: (options: Parameters<UISonner['show']>[0]) => {
    const s = getSonner()
    if (!s) return
    s.show(options)
  }
}
