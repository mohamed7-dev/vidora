import { UI_SHEET_TITLE_TAG_NAME } from './constants'

export class UiSheetTitle extends HTMLElement {
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
        .sheet__title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-2x-small);
        }
        .sheet__title-label {
          margin: 0;
        }
        .sheet__title-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-2x-small);
          padding-inline-end: 3rem;
        }
      </style>
      <div part="base" class="sheet__title">
        <h2 part="label" class="sheet__title-label">
          <slot name="label"></slot>
        </h2>
        <div part="actions" class="sheet__title-actions">
          <slot name="action"></slot>
        </div>
      </div>
    `
  }
}

if (!customElements.get(UI_SHEET_TITLE_TAG_NAME)) {
  customElements.define(UI_SHEET_TITLE_TAG_NAME, UiSheetTitle)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_TITLE_TAG_NAME]: UiSheetTitle
  }
}
