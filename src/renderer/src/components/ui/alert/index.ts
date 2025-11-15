import template from './template.html?raw'
import styleCss from './style.css?inline'

export class UIAlert extends HTMLElement {
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

  private closeBtn: HTMLButtonElement | null = null
  private rootEl: HTMLDivElement | null = null
  private iconEl: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return ['variant', 'closable', 'hidden']
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    this.syncVariant()
    this.syncClosable()
    this.syncHidden()
  }

  private render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UIAlert.sheet]
    const frag = UIAlert.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.append(frag)
    this.cacheRefs()
    this.syncVariant()
    this.syncClosable()
    this.syncHidden()
    this.applyListeners()
  }

  private cacheRefs(): void {
    if (!this.shadowRoot) return
    this.rootEl = this.shadowRoot.querySelector('[data-el="root"]') as HTMLDivElement | null
    this.iconEl = this.shadowRoot.querySelector('[data-el="icon"]') as HTMLElement | null
    this.closeBtn = this.shadowRoot.querySelector(
      '[data-el="close-btn"]'
    ) as HTMLButtonElement | null
  }

  private syncVariant(): void {
    const variant = this.getAttribute('variant') || 'default'
    if (this.rootEl) {
      this.rootEl.setAttribute('data-variant', variant)
    }

    if (this.iconEl) {
      const iconName = variant === 'destructive' ? 'triangle-alert' : 'info'
      this.iconEl.setAttribute('name', iconName)
    }
  }

  private syncClosable(): void {
    const closable = this.hasAttribute('closable')
    if (this.closeBtn) {
      this.closeBtn.style.display = closable ? '' : 'none'
    }
  }

  private syncHidden(): void {
    const isHidden = this.hasAttribute('hidden')
    this.style.display = isHidden ? 'none' : ''
  }

  private applyListeners(): void {
    if (!this.closeBtn) return
    this.closeBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ui-alert-close', { bubbles: true, composed: true }))
      this.hide()
    })
  }

  show(): void {
    this.removeAttribute('hidden')
    this.syncHidden()
  }

  hide(): void {
    this.setAttribute('hidden', '')
    this.syncHidden()
  }
}

if (!customElements.get('ui-alert')) {
  customElements.define('ui-alert', UIAlert)
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-alert': UIAlert
  }

  interface HTMLElementEventMap {
    'ui-alert-close': CustomEvent<void>
  }
}
