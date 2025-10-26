import template from './template.html?raw'
import styleCss from './style.css?inline'
import resetStyle from '@renderer/assets/reset.css?inline'
import appLogoUrl from '@renderer/assets/logo.svg?url'
import { UIButton } from '../ui'
import { NewDialog } from '../new-dialog'

export class HomePage extends HTMLElement {
  private addDownloadBtn: UIButton | null = null
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    await this.render()
    this.setListeners()
  }

  async render(): Promise<void> {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)
    const sheet = new CSSStyleSheet()
    await sheet.replace(resetStyle + styleCss)
    this.shadowRoot!.adoptedStyleSheets = [sheet]
    this.shadowRoot?.append(content)
    const img = this.shadowRoot?.querySelector<HTMLImageElement>('img[data-logo]')
    if (img) img.src = appLogoUrl
    this.addDownloadBtn = this.shadowRoot?.querySelector('#add-download-button') as UIButton
  }

  setListeners(): void {
    if (!this.addDownloadBtn) return
    this.addDownloadBtn.addEventListener('click', () => {
      const newDialog = this.shadowRoot?.querySelector('new-dialog') as NewDialog
      if (newDialog) newDialog.open()
    })
  }
}

customElements.define('home-page', HomePage)
