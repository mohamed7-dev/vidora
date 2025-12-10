import template from './template.html?raw'
import styleCss from './style.css?inline'

export class TestPage extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(styleCss)
    return s
  })()

  private static readonly tpl: HTMLTemplateElement = (() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    const t = doc.querySelector('template') as HTMLTemplateElement
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
    this.shadowRoot.adoptedStyleSheets = [TestPage.sheet]
    this.shadowRoot.append(TestPage.tpl.content.cloneNode(true))
  }
}
if (!customElements.get('test-page')) {
  customElements.define('test-page', TestPage)
}
declare global {
  interface HTMLElementTagNameMap {
    'test-page': TestPage
  }
}
