import template from './template.html?raw'
import styleCss from './style.css?inline'

export class AppSidebar extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('#app-sidebar-template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = styleCss
    this.shadowRoot?.append(style, content)
  }
}

customElements.define('app-sidebar', AppSidebar)
