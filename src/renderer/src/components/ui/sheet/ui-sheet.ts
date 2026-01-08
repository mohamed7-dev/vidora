import {
  CloseEventDetail,
  OpenChangeEventDetail,
  OpenEventDetail,
  SheetSide,
  ToggleEventDetail,
  UI_SHEET_ATTRIBUTES,
  UI_SHEET_EVENTS,
  UI_SHEET_TAG_NAME
} from './constants'
import { ensureComponentWithRegistry } from '@renderer/lib/ui/dom-utils'

let nextSheetId = 1

const sheetRegistry = new Map<string, UiSheet>()

export class UiSheet extends HTMLElement {
  private _open = false
  private _hideXButton = false
  private _alert = false
  private _side: SheetSide = 'right'
  private readonly _instanceId: string
  private _eventsAborter: AbortController | null = null
  // Simple listener registries for reactive props
  private _openListeners = new Set<(open: boolean) => void>()
  private _hideXButtonListeners = new Set<(hide: boolean) => void>()
  private _alertListeners = new Set<(alert: boolean) => void>()
  private _sideListeners = new Set<(side: SheetSide) => void>()

  static get observedAttributes(): string[] {
    return [
      UI_SHEET_ATTRIBUTES.OPEN,
      UI_SHEET_ATTRIBUTES.HIDE_X_BUTTON,
      UI_SHEET_ATTRIBUTES.ALERT,
      UI_SHEET_ATTRIBUTES.SIDE
    ]
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case UI_SHEET_ATTRIBUTES.OPEN:
        this._setOpen(value !== null, { fromAttribute: true })
        break
      case UI_SHEET_ATTRIBUTES.HIDE_X_BUTTON:
        this._setHideXButton(value !== null, { fromAttribute: true })
        break
      case UI_SHEET_ATTRIBUTES.ALERT:
        this._setAlert(value !== null, { fromAttribute: true })
        break
      case UI_SHEET_ATTRIBUTES.SIDE:
        this._setSide((value as SheetSide) || 'right', { fromAttribute: true })
        break
    }
  }

  constructor() {
    super()
    this._instanceId = String(nextSheetId++)
    this.attachShadow({ mode: 'open' })
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <slot></slot>
    `
  }

  connectedCallback(): void {
    this._render()
    this._setupListeners()
    this._init()
    sheetRegistry.set(this._instanceId, this)
  }

  disconnectedCallback(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = null
    sheetRegistry.delete(this._instanceId)
  }

  private _setupListeners(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    this.addEventListener(UI_SHEET_EVENTS.REQUEST_OPEN, this._onRequestOpen.bind(this), {
      signal: this._eventsAborter.signal
    })
    this.addEventListener(UI_SHEET_EVENTS.REQUEST_CLOSE, this._onRequestClose.bind(this), {
      signal: this._eventsAborter.signal
    })
    this.addEventListener(UI_SHEET_EVENTS.REQUEST_TOGGLE, this._onRequestToggle.bind(this), {
      signal: this._eventsAborter.signal
    })
    this.addEventListener(UI_SHEET_EVENTS.OPEN_CHANGE, this._onOpenChange.bind(this), {
      signal: this._eventsAborter.signal
    })
  }

  private _init(): void {
    // Reflect id as an attribute so children (including portaled ones)
    // can discover their owning sheet via data-dialog-id.
    this.setAttribute(UI_SHEET_ATTRIBUTES.INSTANCE_ID, String(this._instanceId))

    if (this.hasAttribute(UI_SHEET_ATTRIBUTES.OPEN)) {
      this._setOpen(true, { fromAttribute: true })
    }
  }

  private _onRequestOpen(event: Event): void {
    const custom = event as CustomEvent<OpenEventDetail>
    const detailId = custom.detail?.sheetId
    // If a specific dialogId is provided and it doesn't match, ignore this request.
    if (detailId !== undefined && detailId !== this.instanceId) return
    this._setOpen(true)
  }

  private _onRequestClose(event: Event): void {
    const custom = event as CustomEvent<CloseEventDetail>
    const detailId = custom.detail?.sheetId
    // If a specific dialogId is provided and it doesn't match, ignore this request.
    if (detailId !== undefined && detailId !== this.instanceId) return

    this._setOpen(false)
  }

  private _onRequestToggle(event: Event): void {
    const custom = event as CustomEvent<ToggleEventDetail>
    const detailId = custom.detail?.sheetId
    // If a specific dialogId is provided and it doesn't match, ignore this request.
    if (detailId !== undefined && detailId !== this.instanceId) return
    this._setOpen(!this._open)
  }

  private _onOpenChange(event: Event): void {
    const custom = event as CustomEvent<OpenChangeEventDetail>
    if (custom.detail?.sheetId !== this.instanceId) return
    if (!custom.detail.open) {
      sheetRegistry.delete(this.instanceId)
    }
  }

  private _setOpen(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._open === next) return
    this._open = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_SHEET_ATTRIBUTES.OPEN, '')
      else this.removeAttribute(UI_SHEET_ATTRIBUTES.OPEN)
    }

    this.dispatchEvent(
      new CustomEvent(UI_SHEET_EVENTS.OPEN_CHANGE, {
        detail: {
          open: this._open,
          sheetId: this.instanceId
        } satisfies OpenChangeEventDetail,
        bubbles: true,
        composed: true
      })
    )

    // Notify any subscribed listeners.
    for (const listener of this._openListeners) {
      try {
        listener(this._open)
      } catch {
        // ignore listener errors
      }
    }
  }

  private _setSide(next: SheetSide, opts?: { fromAttribute?: boolean }): void {
    const normalized: SheetSide =
      next === 'left' || next === 'right' || next === 'top' || next === 'bottom' ? next : 'right'

    if (this._side === normalized) return
    this._side = normalized

    if (!opts?.fromAttribute) {
      this.setAttribute(UI_SHEET_ATTRIBUTES.SIDE, normalized)
    }

    for (const listener of this._sideListeners) {
      try {
        listener(this._side)
      } catch {
        // ignore
      }
    }
  }

  private _setHideXButton(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._hideXButton === next) return
    this._hideXButton = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_SHEET_ATTRIBUTES.HIDE_X_BUTTON, '')
      else this.removeAttribute(UI_SHEET_ATTRIBUTES.HIDE_X_BUTTON)
    }

    for (const listener of this._hideXButtonListeners) {
      try {
        listener(this._hideXButton)
      } catch {
        // ignore
      }
    }
  }

  private _setAlert(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._alert === next) return
    this._alert = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_SHEET_ATTRIBUTES.ALERT, '')
      else this.removeAttribute(UI_SHEET_ATTRIBUTES.ALERT)
    }

    for (const listener of this._alertListeners) {
      try {
        listener(this._alert)
      } catch {
        // ignore
      }
    }
  }

  //------------------------Public API---------------------------

  get open(): boolean {
    return this._open
  }

  set open(value: boolean) {
    this._setOpen(Boolean(value))
  }

  get instanceId(): string {
    return this._instanceId
  }

  get hideXButton(): boolean {
    return this._hideXButton
  }

  set hideXButton(value: boolean) {
    this._setHideXButton(Boolean(value))
  }

  get alert(): boolean {
    return this._alert
  }

  set alert(value: boolean) {
    this._setAlert(Boolean(value))
  }

  get side(): SheetSide {
    return this._side
  }

  set side(value: SheetSide) {
    this._setSide(value)
  }

  // Listener registration APIs. Each returns an unsubscribe function.
  onOpenChange(listener: (open: boolean) => void): () => void {
    this._openListeners.add(listener)
    listener(this._open)
    return () => {
      this._openListeners.delete(listener)
    }
  }

  onHideXButtonChange(listener: (hide: boolean) => void): () => void {
    this._hideXButtonListeners.add(listener)
    listener(this._hideXButton)
    return () => {
      this._hideXButtonListeners.delete(listener)
    }
  }

  onAlertChange(listener: (alert: boolean) => void): () => void {
    this._alertListeners.add(listener)
    listener(this._alert)
    return () => {
      this._alertListeners.delete(listener)
    }
  }
  public onSideChange(listener: (side: SheetSide) => void): () => void {
    this._sideListeners.add(listener)
    listener(this._side)
    return () => {
      this._sideListeners.delete(listener)
    }
  }
}

if (!customElements.get(UI_SHEET_TAG_NAME)) {
  customElements.define(UI_SHEET_TAG_NAME, UiSheet)
}

export function ensureSheet(
  componentTreeRoot: HTMLElement,
  componentTag: string,
  options?: { shouldThrow: boolean }
): UiSheet | null {
  return ensureComponentWithRegistry<UiSheet>(
    componentTreeRoot,
    componentTag,
    UI_SHEET_TAG_NAME,
    UI_SHEET_ATTRIBUTES.INSTANCE_ID,
    sheetRegistry,
    options
  )
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_TAG_NAME]: UiSheet
  }
}
