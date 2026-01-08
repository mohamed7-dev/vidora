import { ensureDialog, type UiDialog } from './ui-dialog'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import { CloseEventDetail, UI_DIALOG_CLOSE_TAG_NAME, UI_DIALOG_EVENTS } from './constants'

export class UiDialogClose extends HTMLElement {
  private _dialog: UiDialog | null = null
  private _target: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._dialog = ensureDialog(this, UI_DIALOG_CLOSE_TAG_NAME)
    this._handleTarget()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._target?.removeEventListener('click', this._onClick)
    this._dialog = null
    this._target = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''

    // Mirror shadcn-style asChild: when `as-child` is present, render only the
    // slot and expect a single slotted child to act as the close button.
    // Otherwise, render a default internal button that wraps the slotted
    // content.
    if (this.hasAttribute('as-child')) {
      this.shadowRoot.innerHTML = `
        <slot></slot>
      `
    } else {
      this.shadowRoot.innerHTML = `
        <ui-button variant="ghost" type="button" part="base">
          <slot></slot>
        </ui-button>
      `
    }
  }

  private _setupListeners(): void {
    this._target?.addEventListener('click', this._onClick)
  }

  private _handleTarget(): void {
    if (this.hasAttribute('as-child')) {
      // as-child: enforce exactly one slotted child and delegate behavior to it.
      this._target = resolveAsChildTarget(this, {
        requireSingleChild: true
      })
      mergeHostAttributesToTarget(this, this._target, {
        exclude: ['as-child'],
        clearFromHost: true
      })
    } else {
      // Non as-child: use the internal button as the interactive target.
      const button = this.shadowRoot?.querySelector('ui-button')
      this._target = (button ?? this) as HTMLElement
    }
  }

  private _onClick = (event: MouseEvent): void => {
    event.preventDefault()
    if (!this._dialog) return
    const dialogId = this._dialog.instanceId
    this._dialog.dispatchEvent(
      new CustomEvent(UI_DIALOG_EVENTS.REQUEST_CLOSE, {
        bubbles: true,
        composed: true,
        detail: dialogId !== undefined ? ({ dialogId } satisfies CloseEventDetail) : undefined
      })
    )
  }
}

if (!customElements.get(UI_DIALOG_CLOSE_TAG_NAME)) {
  customElements.define(UI_DIALOG_CLOSE_TAG_NAME, UiDialogClose)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_CLOSE_TAG_NAME]: UiDialogClose
  }
}
