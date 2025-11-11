import template from './template.html?raw'
import styleCss from './style.css?inline'

export class AreaArticle extends HTMLElement {
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
    return ['first', 'last', 'label']
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'first') {
      this.toggleAttribute('data-first', _newValue !== null)
    }
    if (name === 'last') {
      this.toggleAttribute('data-last', _newValue !== null)
    }
    if (name === 'label') {
      this.toggleAttribute('data-label', _newValue !== null)
      this._syncTitle()
    }
  }

  private _syncTitle(): void {
    if (!this.shadowRoot) return
    const label = this.getAttribute('label')
    const h3 = this.shadowRoot.querySelector('h3')
    if (h3) {
      h3.textContent = label
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

  private _applyAttributes(): void {
    this.toggleAttribute('data-first', this.hasAttribute('first'))
    this.toggleAttribute('data-last', this.hasAttribute('last'))
    this._syncTitle()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [AreaArticle.sheet]
    const frag = AreaArticle.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.appendChild(frag)
  }
}

if (!customElements.get('area-article')) {
  customElements.define('area-article', AreaArticle)
}

declare global {
  interface HTMLElementTagNameMap {
    'area-article': AreaArticle
  }
}
