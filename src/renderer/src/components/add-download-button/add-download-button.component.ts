import { NEW_DIALOG_EVENTS } from '../new-dialog'

const ADD_DOWNLOAD_BUTTON_TAG_NAME = 'add-download-button'

export class AddDownloadButton extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._applyListeners()
  }

  disconnectedCallback(): void {
    this._removeListeners()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.innerHTML = `<ui-button>${window.api.i18n.t`Add Download`}</ui-button>`
  }

  private _applyListeners(): void {
    this.shadowRoot?.querySelector('ui-button')?.addEventListener('click', this._handleClick)
  }

  private _removeListeners(): void {
    this.shadowRoot?.querySelector('ui-button')?.removeEventListener('click', this._handleClick)
  }

  private _handleClick(): void {
    this.dispatchEvent(new CustomEvent(NEW_DIALOG_EVENTS.OPEN, { composed: true, bubbles: true }))
  }
}

if (!customElements.get(ADD_DOWNLOAD_BUTTON_TAG_NAME)) {
  customElements.define(ADD_DOWNLOAD_BUTTON_TAG_NAME, AddDownloadButton)
}

declare global {
  interface HTMLElementTagNameMap {
    [ADD_DOWNLOAD_BUTTON_TAG_NAME]: AddDownloadButton
  }
}
