import html from './page-layout.template.html?raw'
import style from './page-layout.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'

const PAGE_LAYOUT_TAG_NAME = 'page-layout'

export class PageLayout extends HTMLElement {
  private static readonly tpl = createTemplateFromHtml(html)
  private static readonly style = createStyleSheetFromStyle(style)

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
    this.shadowRoot.adoptedStyleSheets = [PageLayout.style]
    this.shadowRoot.append(PageLayout.tpl.content.cloneNode(true))
  }
}

if (!customElements.get(PAGE_LAYOUT_TAG_NAME)) {
  customElements.define(PAGE_LAYOUT_TAG_NAME, PageLayout)
}

declare global {
  interface HTMLElementTagNameMap {
    [PAGE_LAYOUT_TAG_NAME]: PageLayout
  }
}
