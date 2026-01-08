import { UI_DIALOG_HEADER_TAG_NAME } from './constants'
import { ensureDialog, UiDialog } from './ui-dialog'
import { type UiDialogClose } from './ui-dialog-close'

export class UiDialogHeader extends HTMLElement {
  private _dialog: UiDialog | null = null
  private _syncXButtonUnSub: (() => void) | null = null
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._dialog = ensureDialog(this, UI_DIALOG_HEADER_TAG_NAME, {
      shouldThrow: false
    })
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
        .dialog__header {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-x-small);
        }
        .dialog__header-close {
          position: absolute;
          top: 0;
          right: 0;
        }
        :host-context([dir='rtl']) .dialog__header-close {
          right: auto;
          left: 0;
        }
      </style>

      <header class="dialog__header" part="base">
        <slot></slot>
        <ui-dialog-close as-child>
          <ui-button class="dialog__header-close" variant="ghost" size="icon" part="close-button" type="button">
            <ui-icon name="x"></ui-icon>
          </ui-button>
        </ui-dialog-close>
      </header>
    `
  }

  private _syncXButton(hide: boolean): void {
    if (!this._dialog) return

    const xButton = this.shadowRoot?.querySelector('ui-dialog-close') as UiDialogClose | null

    if (xButton) {
      if (hide) {
        xButton.remove()
      }
    }
  }

  private _setupListeners(): void {
    this._syncXButtonUnSub =
      this._dialog?.onHideXButtonChange((hide) => this._syncXButton(hide)) ?? null
  }
}

if (!customElements.get(UI_DIALOG_HEADER_TAG_NAME)) {
  customElements.define(UI_DIALOG_HEADER_TAG_NAME, UiDialogHeader)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_HEADER_TAG_NAME]: UiDialogHeader
  }
}
