import { UI_DIALOG_DESCRIPTION_TAG_NAME } from './constants'

export class UiDialogDescription extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .dialog__description {
          margin: 0;
        } 
      </style>
      <div part="base" class="dialog__description">
        <slot></slot>
      </div>
    `
  }
}

if (!customElements.get(UI_DIALOG_DESCRIPTION_TAG_NAME)) {
  customElements.define(UI_DIALOG_DESCRIPTION_TAG_NAME, UiDialogDescription)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_DESCRIPTION_TAG_NAME]: UiDialogDescription
  }
}
