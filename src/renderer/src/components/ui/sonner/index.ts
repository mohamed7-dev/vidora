import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIIcon } from '../icon'
import { UIButton } from '../button'

export type SonnerVariant = 'default' | 'destructive'

export type SonnerOptions = {
  variant?: SonnerVariant
  title?: string
  description?: string
  duration?: number
}

export class UISonner extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(styleCss)
    return s
  })()

  private static readonly tpl: HTMLTemplateElement = (() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    const inner = doc.querySelector('template')
    const t = document.createElement('template')
    t.innerHTML = inner ? inner.innerHTML : template
    return t
  })()

  private _rootEl: HTMLDivElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.render()
  }

  private render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UISonner.sheet]
    const frag = UISonner.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.append(frag)
    this._rootEl = this.shadowRoot.querySelector('.ui-sonner-root') as HTMLDivElement | null
  }

  show(opts: SonnerOptions): void {
    if (!this._rootEl) return
    const variant: SonnerVariant = opts.variant || 'default'
    const toast = document.createElement('div')
    toast.className = 'ui-sonner-toast'
    toast.setAttribute('data-variant', variant)

    const icon = document.createElement('ui-icon') as UIIcon
    icon.classList.add('ui-sonner-toast__icon')
    icon.setAttribute('name', variant === 'destructive' ? 'triangle-alert' : 'info')

    const content = document.createElement('div')
    content.className = 'ui-sonner-toast__content'

    if (opts.title) {
      const titleEl = document.createElement('div')
      titleEl.className = 'ui-sonner-toast__title'
      titleEl.textContent = opts.title
      content.append(titleEl)
    }

    if (opts.description) {
      const descEl = document.createElement('div')
      descEl.className = 'ui-sonner-toast__desc'
      descEl.textContent = opts.description
      content.append(descEl)
    }

    const closeBtn = document.createElement('ui-button') as UIButton
    closeBtn.classList.add('ui-sonner-toast__close')
    closeBtn.setAttribute('variant', 'ghost')
    closeBtn.setAttribute('size', 'icon')
    const xIcon = document.createElement('ui-icon') as UIIcon
    xIcon.setAttribute('name', 'x')
    xIcon.setAttribute('slot', 'prefix')
    closeBtn.append(xIcon)

    closeBtn.addEventListener('click', () => {
      this._rootEl?.removeChild(toast)
    })

    toast.append(icon, content, closeBtn)
    this._rootEl.append(toast)

    const duration = typeof opts.duration === 'number' ? opts.duration : 5000
    if (duration > 0) {
      window.setTimeout(() => {
        if (toast.isConnected) {
          this._rootEl?.removeChild(toast)
        }
      }, duration)
    }
  }
}

if (!customElements.get('ui-sonner')) {
  customElements.define('ui-sonner', UISonner)
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-sonner': UISonner
  }
}
