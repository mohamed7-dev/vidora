import style from './style.css?inline'
import { ICONS } from './icons'
import { createStyleSheetFromStyle } from '../lib/template-loader'

const UI_ICON_NAME = 'ui-icon'

const ATTRIBUTES = {
  NAME: 'name'
}

export class UIIcon extends HTMLElement {
  private _stylesheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
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
    if (name === ATTRIBUTES.NAME) this._updateIcon()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [this._stylesheet]
  }

  private _updateIcon(): void {
    if (!this.shadowRoot) return
    const name = this.name ?? ''
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
    return this.getAttribute(ATTRIBUTES.NAME)
  }

  set name(v: string | null) {
    if (v === null) this.removeAttribute(ATTRIBUTES.NAME)
    else this.setAttribute(ATTRIBUTES.NAME, v)
  }
}

if (!customElements.get(UI_ICON_NAME)) customElements.define(UI_ICON_NAME, UIIcon)

declare global {
  interface HTMLElementTagNameMap {
    [UI_ICON_NAME]: UIIcon
  }
}
