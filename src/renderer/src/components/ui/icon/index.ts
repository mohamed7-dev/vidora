import style from './style.css?inline'
import { ICONS } from './icons'

export class UIIcon extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['name']
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._updateIcon()
  }

  attributeChangedCallback(name: string): void {
    if (name === 'name') this._updateIcon()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''

    const sheet = new CSSStyleSheet()
    sheet.replaceSync(style)
    this.shadowRoot.adoptedStyleSheets = [sheet]
  }

  private _updateIcon(): void {
    if (!this.shadowRoot) return
    const name = this.getAttribute('name') ?? ''
    const svg = ICONS[name]
    if (svg) {
      this.shadowRoot.innerHTML = svg
    } else {
      // simple fallback: empty box
      this.shadowRoot.innerHTML =
        '<svg part="svg" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor" opacity="0.15"/></svg>'
    }
  }

  get name(): string | null {
    return this.getAttribute('name')
  }

  set name(v: string | null) {
    if (v === null) this.removeAttribute('name')
    else this.setAttribute('name', v)
  }
}

if (!customElements.get('ui-icon')) customElements.define('ui-icon', UIIcon)

declare global {
  interface HTMLElementTagNameMap {
    'ui-icon': UIIcon
  }
}
