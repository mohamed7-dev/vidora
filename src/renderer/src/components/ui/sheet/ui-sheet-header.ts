import { ensureSheet, UiSheet } from './ui-sheet'
import { UiSheetClose } from './ui-sheet-close'
import { UI_SHEET_HEADER_TAG_NAME } from './constants'

export class UiSheetHeader extends HTMLElement {
  private _sheet: UiSheet | null = null
  private _syncXButtonUnSub: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._sheet = ensureSheet(this, UI_SHEET_HEADER_TAG_NAME)
    this._render()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._syncXButtonUnSub?.()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
        }
        .sheet__header {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-x-small);
        }
        .sheet__header-close {
          position: absolute;
          top: 0;
          right: 0;
        }
        :host-context([dir='rtl']) .sheet__header-close {
          right: auto;
          left: 0;
        }  
      </style>

      <header class="sheet__header" part="base">
        <slot></slot>
        <ui-sheet-close as-child>
          <ui-button class="sheet__header-close" variant="ghost" size="icon" part="close-button" type="button">
            <ui-icon name="x"></ui-icon>
          </ui-button>
        </ui-sheet-close>
      </header>
    `
  }

  private _setupListeners(): void {
    this._syncXButtonUnSub =
      this._sheet?.onHideXButtonChange((hide) => this._syncXButton(hide)) ?? null
  }

  private _syncXButton(hide: boolean): void {
    if (!this._sheet) return

    const xButton = this.shadowRoot?.querySelector('ui-sheet-close') as UiSheetClose | null

    if (xButton) {
      if (hide) {
        xButton.remove()
      }
    }
  }
}

if (!customElements.get(UI_SHEET_HEADER_TAG_NAME)) {
  customElements.define(UI_SHEET_HEADER_TAG_NAME, UiSheetHeader)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_HEADER_TAG_NAME]: UiSheetHeader
  }
}
