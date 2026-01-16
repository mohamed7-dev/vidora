import { UI_SHEET_OVERLAY_TAG_NAME } from './constants'

export class UiSheetOverlay extends HTMLElement {
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
        :host {
          display: block;
        }
        .sheet__overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: var(
            --ui-sheet-overlay-bg,
            color-mix(in oklch, var(--popover) 60%, transparent)
          );
        }
      </style>
      <div part="base" class="sheet__overlay">
        <slot></slot>
      </div>
    `
  }
}

if (!customElements.get(UI_SHEET_OVERLAY_TAG_NAME)) {
  customElements.define(UI_SHEET_OVERLAY_TAG_NAME, UiSheetOverlay)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_OVERLAY_TAG_NAME]: UiSheetOverlay
  }
}
