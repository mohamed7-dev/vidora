import html from './ui-sonner.template.html?raw'
import style from './ui-sonner.style.css?inline'
import { createPresenceAnimator, PresenceAnimator } from '@renderer/lib/ui/animation'
import { UiButton } from '../button/ui-button'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { UiIcon } from '../icon/ui-icon'

const UI_SONNER_TAG_NAME = 'ui-sonner'
const ICONS = {
  default: 'info',
  destructive: 'triangle-alert'
}
export type SonnerVariant = 'default' | 'destructive'

export type SonnerOptions = {
  variant?: SonnerVariant
  title: string
  description: string
  duration?: number
}

export class UISonner extends HTMLElement {
  private static readonly tpl = createTemplateFromHtml(html)
  private static readonly style = createStyleSheetFromStyle(style)
  // refs
  private _rootEl: HTMLDivElement | null = null
  private _toastTpl: HTMLTemplateElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UISonner.style]
    this.shadowRoot.appendChild(UISonner.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._rootEl = this.shadowRoot.querySelector('[data-el="root"]') as HTMLDivElement | null
    this._toastTpl = this.shadowRoot.querySelector(
      '[data-el="toast-template"]'
    ) as HTMLTemplateElement | null
  }

  show(opts: SonnerOptions): void {
    if (!this._rootEl || !this._toastTpl) return

    const variant: SonnerVariant = opts.variant || 'default'

    const frag = this._toastTpl.content.cloneNode(true) as DocumentFragment
    const toast = frag.querySelector('[data-el="toast"]') as HTMLDivElement | null
    const icon = frag.querySelector('[data-el="icon"]') as UiIcon | null
    const titleEl = frag.querySelector('[data-el="title"]') as HTMLDivElement | null
    const descEl = frag.querySelector('[data-el="description"]') as HTMLDivElement | null
    const closeBtn = frag.querySelector('[data-el="close"]') as UiButton | null

    if (!toast) return

    toast.setAttribute('data-variant', variant)
    // Help assistive tech understand the severity of this notification.
    toast.setAttribute('role', variant === 'destructive' ? 'alert' : 'status')

    if (icon) {
      icon.setAttribute('name', ICONS[variant])
    }

    if (titleEl) {
      titleEl.textContent = opts.title ?? ''
      titleEl.toggleAttribute('hidden', !opts.title)
    }

    if (descEl) {
      descEl.textContent = opts.description ?? ''
      descEl.toggleAttribute('hidden', !opts.description)
    }

    const animator = createAnimator(toast)

    const removeToast = (): void => {
      if (!toast.isConnected) return
      void (async () => {
        await animator.exit()
        if (toast.isConnected) toast.remove()
      })()
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', removeToast, { once: true })
    }

    this._rootEl.append(frag)

    // Play entrance animation after mounting.
    void animator.enter()

    const duration = typeof opts.duration === 'number' ? opts.duration : 5000
    if (duration > 0) {
      window.setTimeout(removeToast, duration)
    }
  }
}

if (!customElements.get(UI_SONNER_TAG_NAME)) {
  customElements.define(UI_SONNER_TAG_NAME, UISonner)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SONNER_TAG_NAME]: UISonner
  }
}

function createAnimator(toast: HTMLDivElement): PresenceAnimator {
  return createPresenceAnimator(
    toast,
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(8px)' }
    ],
    { duration: 200, easing: 'ease-out', fill: 'forwards' }
  )
}
