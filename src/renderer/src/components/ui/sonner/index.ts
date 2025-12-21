import template from './template.html?raw'
import style from './style.css?inline'
import { UIIcon } from '../icon'
import { UIButton } from '../button'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../lib/template-loader'
import { createPresenceAnimator } from '../lib/animation'

const UI_SONNER_NAME = 'ui-sonner'
const ICONS = {
  default: 'info',
  destructive: 'triangle-alert'
}
export type SonnerVariant = 'default' | 'destructive'

export type SonnerOptions = {
  variant?: SonnerVariant
  title?: string
  description?: string
  duration?: number
}

export class UISonner extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)

  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(template)

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
    this.shadowRoot.adoptedStyleSheets = [UISonner.sheet]
    const frag = UISonner.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.append(frag)
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
    const icon = frag.querySelector('[data-el="icon"]') as UIIcon | null
    const titleEl = frag.querySelector('[data-el="title"]') as HTMLDivElement | null
    const descEl = frag.querySelector('[data-el="description"]') as HTMLDivElement | null
    const closeBtn = frag.querySelector('[data-el="close"]') as UIButton | null

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

    const animator = createPresenceAnimator(
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

if (!customElements.get(UI_SONNER_NAME)) {
  customElements.define(UI_SONNER_NAME, UISonner)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SONNER_NAME]: UISonner
  }
}
