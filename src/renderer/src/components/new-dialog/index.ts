import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?inline'
import styleCss from './style.css?inline'
import iconNewSvg from '@renderer/assets/icons/plus.svg?raw'
import { UIButton } from '../ui'
import { UIDialog } from '../ui/dialog'

export class NewDialog extends HTMLElement {
  private btnNew: UIButton | null = null
  private _dialogEl: UIDialog | null = null
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.render()
    this.applySvgIcons()
  }

  private applySvgIcons(): void {
    if (this.btnNew) this.btnNew.innerHTML = iconNewSvg
  }

  private render(): void {
    const parser = new DOMParser()
    const parsedTree = parser.parseFromString(template, 'text/html')
    const templateElement = parsedTree.querySelector<HTMLTemplateElement>('#new-dialog-template')
    if (!templateElement) return
    const content = templateElement.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = resetStyle + styleCss
    this.shadowRoot?.appendChild(style)
    this.shadowRoot?.appendChild(content)
    this.btnNew = this.shadowRoot?.querySelector('#trigger-button') as UIButton | null
    this._dialogEl = this.shadowRoot?.querySelector('ui-dialog') as UIDialog | null
  }

  open(): void {
    if (this._dialogEl) this._dialogEl.openDialog()
  }

  close(): void {
    if (this._dialogEl) this._dialogEl.close()
  }
}

customElements.define('new-dialog', NewDialog)

declare global {
  interface HTMLElementTagNameMap {
    'new-dialog': NewDialog
  }
}
