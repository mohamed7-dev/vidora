import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import { ensureSheet, UiSheet } from './ui-sheet'
import { CloseEventDetail, UI_SHEET_CLOSE_TAG_NAME, UI_SHEET_EVENTS } from './constants'

export class UiSheetClose extends HTMLElement {
  private _sheet: UiSheet | null = null
  private _target: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._sheet = ensureSheet(this, UI_SHEET_CLOSE_TAG_NAME)
    this._handleTarget()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._target?.removeEventListener('click', this._onClick)
    this._sheet = null
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
    if (!this._sheet) return
    const sheetId = this._sheet.instanceId
    this._sheet.dispatchEvent(
      new CustomEvent(UI_SHEET_EVENTS.REQUEST_CLOSE, {
        bubbles: true,
        composed: true,
        detail: sheetId !== undefined ? ({ sheetId } satisfies CloseEventDetail) : undefined
      })
    )
  }
}

if (!customElements.get(UI_SHEET_CLOSE_TAG_NAME)) {
  customElements.define(UI_SHEET_CLOSE_TAG_NAME, UiSheetClose)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_CLOSE_TAG_NAME]: UiSheetClose
  }
}
