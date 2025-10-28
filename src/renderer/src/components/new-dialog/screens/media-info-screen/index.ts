import template from './template.html?raw'
import styleCss from './style.css?inline'
import resetStyle from '@renderer/assets/reset.css?inline'

export class MediaInfoScreen extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const parsedTree = parser.parseFromString(template, 'text/html')
    const templateElement = parsedTree.querySelector<HTMLTemplateElement>('template')
    if (!templateElement) return
    const frag = templateElement.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = resetStyle + styleCss
    this.shadowRoot?.appendChild(style)
    this.shadowRoot?.appendChild(frag)
  }
}

customElements.define('media-info-screen', MediaInfoScreen)
