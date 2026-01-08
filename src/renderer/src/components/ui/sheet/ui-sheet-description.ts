import { UI_SHEET_DESCRIPTION_TAG_NAME } from './constants'
export class UiSheetDescription extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .sheet__description {
          margin: 0;
        } 
      </style>
      <div part="base" class="sheet__description">
        <slot></slot>
      </div>
    `
  }
}

if (!customElements.get(UI_SHEET_DESCRIPTION_TAG_NAME)) {
  customElements.define(UI_SHEET_DESCRIPTION_TAG_NAME, UiSheetDescription)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_DESCRIPTION_TAG_NAME]: UiSheetDescription
  }
}
