import { UI_DIALOG_FOOTER_TAG_NAME } from './constants'

export class UiDialogFooter extends HTMLElement {
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
        .dialog__footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--ui-dialog-footer-gap, var(--spacing-x-small));
        }
      </style>
      <footer class="dialog__footer" part="base">
          <slot></slot>
      </footer>
    `
  }
}

if (!customElements.get(UI_DIALOG_FOOTER_TAG_NAME)) {
  customElements.define(UI_DIALOG_FOOTER_TAG_NAME, UiDialogFooter)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_FOOTER_TAG_NAME]: UiDialogFooter
  }
}
