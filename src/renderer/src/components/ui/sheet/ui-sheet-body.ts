import { sharedStyle } from '@renderer/lib/ui/shared-style'
import { UI_SHEET_BODY_TAG_NAME } from './constants'
export class UiSheetBody extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.innerHTML = `
    <style>
      ${sharedStyle}
      :host {
        flex: 1 1 auto;
        min-height: 0;
        box-sizing: border-box;
      }
      .sheet__body {
        box-sizing: border-box;
        height: 100%; 
        overflow: auto;
      }
    </style>
      <div part="base" class="sheet__body">
        <slot></slot>
      </div>
    `
  }
}

if (!customElements.get(UI_SHEET_BODY_TAG_NAME)) {
  customElements.define(UI_SHEET_BODY_TAG_NAME, UiSheetBody)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_BODY_TAG_NAME]: UiSheetBody
  }
}
