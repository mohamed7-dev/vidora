import { UI_DIALOG_OVERLAY_TAG_NAME } from './constants'

export class UiDialogOverlay extends HTMLElement {
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
        .dialog__overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: var(
            --ui-dialog-overlay-bg,
            color-mix(in oklch, black 40%, transparent)
          );
          backdrop-filter: blur(6px);
        }
        :host-context(.dark) .dialog__overlay{
          background: var(
            --ui-dialog-overlay-bg-dark,
            color-mix(in oklch, white 12%, transparent)
          );
        }  
      </style>
      <div part="base" class="dialog__overlay">
        <slot></slot>
      </div>
    `
  }
}

if (!customElements.get(UI_DIALOG_OVERLAY_TAG_NAME)) {
  customElements.define(UI_DIALOG_OVERLAY_TAG_NAME, UiDialogOverlay)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_OVERLAY_TAG_NAME]: UiDialogOverlay
  }
}
