import template from './template.html?raw'
import styleCss from './style.css?inline'

export class NoDataPlaceholder extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
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

  // refs
  private _subtitle: HTMLParagraphElement | null = null

  // states
  private t = window.api?.i18n?.t || (() => '')

  static get observedAttributes(): string[] {
    return ['hide', 'message']
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'hide') {
      this.toggleAttribute('data-hide', _newValue !== null)
    }
    if (name === 'message') {
      this._applyMessage()
    }
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._applyI18n()
    this._applyMessage()
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._subtitle = this.shadowRoot?.querySelector('[data-el="sub"]') as HTMLParagraphElement
  }

  private _applyI18n(): void {
    const i18n = this.shadowRoot?.querySelectorAll('[data-i18n]')
    if (!i18n) return
    i18n.forEach((el) => {
      el.textContent = this.t(el.getAttribute('data-i18n') || '')
    })
  }

  private _applyMessage(): void {
    const message = this.getAttribute('message')
    if (!message) return
    if (!this._subtitle) return
    this._subtitle.textContent = message // TODO: localize
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [NoDataPlaceholder.sheet]
    const frag = NoDataPlaceholder.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.appendChild(frag)
  }
}

if (!customElements.get('nodata-placeholder')) {
  customElements.define('nodata-placeholder', NoDataPlaceholder)
}

declare global {
  interface HTMLElementTagNameMap {
    'nodata-placeholder': NoDataPlaceholder
  }
}
