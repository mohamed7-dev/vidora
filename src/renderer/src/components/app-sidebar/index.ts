import template from './template.html?raw'
import styleCss from './style.css?inline'

export class AppSidebar extends HTMLElement {
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

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [AppSidebar.sheet]
    // append cached template content
    this.shadowRoot.append(AppSidebar.tpl.content.cloneNode(true))
  }
}
if (!customElements.get('app-sidebar')) customElements.define('app-sidebar', AppSidebar)

declare global {
  interface HTMLElementTagNameMap {
    'app-sidebar': AppSidebar
  }
}
