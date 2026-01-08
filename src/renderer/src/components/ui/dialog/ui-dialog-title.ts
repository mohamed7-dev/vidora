import { UI_DIALOG_TITLE_TAG_NAME } from './constants'

export class UiDialogTitle extends HTMLElement {
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
        .dialog__title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.25rem;
        }
        .dialog__title-label {
          margin: 0;
        }
        .dialog__title-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding-inline-end: 3rem;
        }
      </style>
      <div part="base" class="dialog__title">
        <h2 part="label" class="dialog__title-label">
          <slot name="label"></slot>
        </h2>
        <div part="actions" class="dialog__title-actions">
          <slot name="action"></slot>
        </div>
      </div>
    `
  }
}

if (!customElements.get(UI_DIALOG_TITLE_TAG_NAME)) {
  customElements.define(UI_DIALOG_TITLE_TAG_NAME, UiDialogTitle)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_TITLE_TAG_NAME]: UiDialogTitle
  }
}
