import style from './style.css?inline'
import { createStyleSheetFromStyle } from '../lib/template-loader'
import { UIDialog } from '../dialog'

const SHEET_NAME = 'ui-sheet'
const ATTRIBUTES = {
  OPEN: 'open',
  SIDE: 'side',
  SHOW_X_BUTTON: 'show-x-button',
  ALERT: 'alert'
}

export type SheetSide = 'left' | 'right' | 'top' | 'bottom'
type Source = 'close-button' | 'keyboard' | 'overlay' | 'cancel'

export type UIRequestCloseDetail = {
  source: Source
}

export class UISheet extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)

  private _dialogEl: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return

    if (name === ATTRIBUTES.OPEN) {
      this._syncDialogOpen()
    }

    if (name === ATTRIBUTES.SHOW_X_BUTTON) {
      this._syncDialogXVisibility()
    }

    if (name === ATTRIBUTES.SIDE) {
      this._syncSide()
    }

    if (name === ATTRIBUTES.ALERT) {
      this._syncDialogAlert()
    }
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._wireDialogEvents()

    this._syncDialogOpen()
    this._syncDialogXVisibility()
    this._syncSide()
    this._syncDialogAlert()
  }

  disconnectedCallback(): void {
    if (!this._dialogEl) return
    this._dialogEl.removeEventListener(
      'ui-request-close',
      this._onDialogRequestClose as EventListener
    )
    this._dialogEl = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UISheet.sheet]

    this.shadowRoot.innerHTML = `
      <ui-dialog part="dialog">
          ${this.innerHTML}
      </ui-dialog>
    `
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._dialogEl = this.shadowRoot.querySelector('ui-dialog') as UIDialog | null
  }

  private _wireDialogEvents(): void {
    if (!this._dialogEl) return
    this._dialogEl.addEventListener('ui-request-close', this._onDialogRequestClose as EventListener)
  }

  private _onDialogRequestClose = (event: CustomEvent<UIRequestCloseDetail>): void => {
    const forwarded = new CustomEvent<UIRequestCloseDetail>('sheet-request-close', {
      bubbles: true,
      cancelable: true,
      detail: event.detail
    })

    const notPrevented = this.dispatchEvent(forwarded)
    if (notPrevented) {
      this.closeSheet()
    }
  }

  private _syncDialogOpen(): void {
    if (!this._dialogEl) return
    if (this.open) {
      this._dialogEl.setAttribute('open', '')
    } else {
      this._dialogEl.removeAttribute('open')
    }
  }

  private _syncDialogXVisibility(): void {
    if (!this._dialogEl) return
    if (this.showXButton) {
      this._dialogEl.setAttribute('show-x-button', '')
    } else {
      this._dialogEl.removeAttribute('show-x-button')
    }
  }

  private _syncDialogAlert(): void {
    if (!this._dialogEl) return
    if (this.alert) {
      this._dialogEl.setAttribute('alert', '')
    } else {
      this._dialogEl.removeAttribute('alert')
    }
  }

  private _syncSide(): void {
    if (!this._dialogEl) return
    const side = this.side || 'left'
    this._dialogEl.setAttribute('data-sheet-side', side)
  }

  //-----------------------------------Public API-----------------------------------

  get open(): boolean {
    return this.hasAttribute(ATTRIBUTES.OPEN)
  }

  set open(value: boolean) {
    if (value) this.setAttribute(ATTRIBUTES.OPEN, '')
    else this.removeAttribute(ATTRIBUTES.OPEN)
  }

  get side(): SheetSide {
    const val = this.getAttribute(ATTRIBUTES.SIDE) as SheetSide | null
    return (val ?? 'left') as SheetSide
  }

  set side(value: SheetSide) {
    this.setAttribute(ATTRIBUTES.SIDE, value)
  }

  get alert(): boolean {
    return this.hasAttribute(ATTRIBUTES.ALERT)
  }

  set alert(value: boolean) {
    if (!value) {
      this.removeAttribute(ATTRIBUTES.ALERT)
    } else {
      this.setAttribute(ATTRIBUTES.ALERT, '')
    }
  }

  get showXButton(): boolean {
    return this.hasAttribute(ATTRIBUTES.SHOW_X_BUTTON)
  }

  set showXButton(value: boolean) {
    if (!value) {
      this.removeAttribute(ATTRIBUTES.SHOW_X_BUTTON)
    } else {
      this.setAttribute(ATTRIBUTES.SHOW_X_BUTTON, '')
    }
  }

  openSheet(): void {
    this.open = true
  }

  closeSheet(): void {
    this.open = false
  }

  toggleSheet(): void {
    this.open = !this.open
  }
}

if (!customElements.get(SHEET_NAME)) customElements.define(SHEET_NAME, UISheet)

declare global {
  interface HTMLElementTagNameMap {
    [SHEET_NAME]: UISheet
  }

  interface HTMLElementEventMap {
    'sheet-request-close': CustomEvent<UIRequestCloseDetail>
  }
}
