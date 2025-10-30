import template from './template.html?raw'
import style from './style.css?inline'
import { ICONS } from './icons'

export class UIIcon extends HTMLElement {
  private _container: HTMLSpanElement | null = null

  static get observedAttributes(): string[] {
    return ['name']
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.render()
    this._updateIcon()
  }

  attributeChangedCallback(name: string): void {
    if (name === 'name') this._updateIcon()
  }

  private render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''

    const sheet = new CSSStyleSheet()
    sheet.replaceSync(style)
    this.shadowRoot.adoptedStyleSheets = [sheet]

    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector('template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)
    this.shadowRoot.append(content)

    this._container = this.shadowRoot.querySelector('.icon')
  }

  private _updateIcon(): void {
    if (!this._container) return
    const name = this.getAttribute('name') ?? ''
    const svg = ICONS[name]
    if (svg) {
      this._container.innerHTML = svg
    } else {
      // simple fallback: empty box
      this._container.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="currentColor" opacity="0.15"/></svg>'
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
