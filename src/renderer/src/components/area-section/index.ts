import template from './template.html?raw'
import styleCss from './style.css?inline'

export class AreaSection extends HTMLElement {
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

  static get observedAttributes(): string[] {
    return ['label']
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'label') {
      this.toggleAttribute('data-label', _newValue !== null)
      this._syncLabel()
    }
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._applyAttributes()
  }

  private _syncLabel(): void {
    if (!this.shadowRoot) return
    const label = this.getAttribute('label')
    const h2 = this.shadowRoot.querySelector('h2')
    if (h2) {
      h2.textContent = label
    }
  }

  private _applyAttributes(): void {
    this._syncLabel()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [AreaSection.sheet]
    const frag = AreaSection.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.appendChild(frag)
  }
}

if (!customElements.get('area-section')) {
  customElements.define('area-section', AreaSection)
}

declare global {
  interface HTMLElementTagNameMap {
    'area-section': AreaSection
  }
}
