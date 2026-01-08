import { sharedStyle } from '@renderer/lib/ui/shared-style'
import { UI_DIALOG_BODY_TAG_NAME } from './constants'

export class UiDialogBody extends HTMLElement {
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
      ${sharedStyle}
      :host {
        flex: 1 1 auto;
        min-height: 0;
        box-sizing: border-box;
      }
      .dialog__body {
        box-sizing: border-box;
        height: 100%; 
        overflow: auto;
        padding: var(--spacing-x-small);
      }
    </style>
    <div part="base" class="dialog__body">
      <slot></slot>
    </div>
    `
  }
}

if (!customElements.get(UI_DIALOG_BODY_TAG_NAME)) {
  customElements.define(UI_DIALOG_BODY_TAG_NAME, UiDialogBody)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_BODY_TAG_NAME]: UiDialogBody
  }
}
