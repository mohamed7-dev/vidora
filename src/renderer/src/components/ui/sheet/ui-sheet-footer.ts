import { UI_SHEET_FOOTER_TAG_NAME } from './constants'

export class UiSheetFooter extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .sheet__footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--ui-sheet-footer-gap, var(--spacing-x-small));
        }
      </style>
      <footer class="sheet__footer" part="base">
          <slot></slot>
      </footer>
    `
  }
}

if (!customElements.get(UI_SHEET_FOOTER_TAG_NAME)) {
  customElements.define(UI_SHEET_FOOTER_TAG_NAME, UiSheetFooter)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_FOOTER_TAG_NAME]: UiSheetFooter
  }
}
