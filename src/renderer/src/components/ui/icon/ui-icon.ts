import style from './ui-icon.style.css?inline'
import { createStyleSheetFromStyle } from '@renderer/lib/ui/dom-utils'
import { Icons, ICONS } from './icons'

const UI_ICON_TAG_NAME = 'ui-icon'

const UI_ICON_ATTRIBUTES = {
  NAME: 'name'
}

export class UiIcon extends HTMLElement {
  private static readonly sheet = createStyleSheetFromStyle(style)

  static get observedAttributes(): string[] {
    return [UI_ICON_ATTRIBUTES.NAME]
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._updateIcon()
  }

  attributeChangedCallback(name: string): void {
    if (name === UI_ICON_ATTRIBUTES.NAME) this._updateIcon()
  }

  private _updateIcon(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UiIcon.sheet]

    const name = this.name
    const svg = name ? ICONS[name] : null
    if (svg) {
      this.shadowRoot.innerHTML = `
        ${this.shadowRoot.innerHTML}
        ${svg}
      `
    } else {
      // simple fallback: empty box
      this.shadowRoot.innerHTML = `
        ${this.shadowRoot.innerHTML}
        <svg part="svg" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor" opacity="0.15"/></svg>
      `
    }
  }

  get name(): Icons | null {
    return this.getAttribute(UI_ICON_ATTRIBUTES.NAME) as Icons
  }

  set name(v: Icons | null) {
    if (v === null) this.removeAttribute(UI_ICON_ATTRIBUTES.NAME)
    else this.setAttribute(UI_ICON_ATTRIBUTES.NAME, v)
  }
}

if (!customElements.get(UI_ICON_TAG_NAME)) customElements.define(UI_ICON_TAG_NAME, UiIcon)

declare global {
  interface HTMLElementTagNameMap {
    [UI_ICON_TAG_NAME]: UiIcon
  }
}
