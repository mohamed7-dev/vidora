import './content/index'
import html from './template.html?raw'
import style from './style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../ui/lib/template-loader'

const APP_SIDEBAR_NAME = 'app-sidebar'

export class AppSidebar extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

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
    this.shadowRoot.adoptedStyleSheets = [AppSidebar.sheet]
    this.shadowRoot.append(AppSidebar.tpl.content.cloneNode(true))
  }
}
if (!customElements.get(APP_SIDEBAR_NAME)) customElements.define(APP_SIDEBAR_NAME, AppSidebar)

declare global {
  interface HTMLElementTagNameMap {
    [APP_SIDEBAR_NAME]: AppSidebar
  }
}
