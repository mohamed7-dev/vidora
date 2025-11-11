import template from './template.html?raw'
import style from './style.css?inline'

export class UITooltip extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(style)
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
  private _baseEl: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return ['side', 'align', 'offset', 'variant']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'side') this._syncSide()
    if (name === 'align') this._syncAlign()
    if (name === 'offset') this._syncOffset()
    if (name === 'variant') this._syncVariant()
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()

    this._syncSide()
    this._syncAlign()
    this._syncOffset()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UITooltip.sheet]
    this.shadowRoot.append(UITooltip.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._baseEl = this.shadowRoot.querySelector('[data-el="base"]') as HTMLElement | null
  }

  private _syncSide(): void {
    const side = (this.getAttribute('side') || 'top').toLowerCase()
    if (this._baseEl) this._baseEl.setAttribute('data-side', side)
  }

  private _syncAlign(): void {
    const align = (this.getAttribute('align') || 'center').toLowerCase()
    if (this._baseEl) this._baseEl.setAttribute('data-align', align)
  }

  private _syncOffset(): void {
    const off = Number(this.getAttribute('offset') || '8')
    const px = isNaN(off) ? 8 : off
    this.style.setProperty('--ui-tooltip-offset', `${px}px`)
  }

  private _syncVariant(): void {
    const variant = (this.getAttribute('variant') || 'default').toLowerCase()
    if (this._baseEl) this._baseEl.setAttribute('data-variant', variant)
  }
}

if (!customElements.get('ui-tooltip')) {
  customElements.define('ui-tooltip', UITooltip)
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tooltip': UITooltip
  }
}
