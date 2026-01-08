import { ensureComponentWithRegistry } from '@renderer/lib/ui/dom-utils'
import {
  CloseEventDetail,
  OpenChangeEventDetail,
  OpenEventDetail,
  ToggleEventDetail,
  UI_DIALOG_ATTRIBUTES,
  UI_DIALOG_EVENTS,
  UI_DIALOG_TAG_NAME
} from './constants'

let nextDialogId = 1

const dialogRegistry = new Map<string, UiDialog>()

export class UiDialog extends HTMLElement {
  private _open = false
  private _hideXButton = false
  private _alert = false
  private readonly _instanceId: string
  // Simple listener registries for reactive props
  private _openListeners = new Set<(open: boolean) => void>()
  private _hideXButtonListeners = new Set<(show: boolean) => void>()
  private _alertListeners = new Set<(alert: boolean) => void>()
  private _eventsAborter: AbortController | null = null

  static get observedAttributes(): string[] {
    return [
      UI_DIALOG_ATTRIBUTES.OPEN,
      UI_DIALOG_ATTRIBUTES.HIDE_X_BUTTON,
      UI_DIALOG_ATTRIBUTES.ALERT
    ]
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case UI_DIALOG_ATTRIBUTES.OPEN:
        this._setOpen(value !== null, { fromAttribute: true })
        break
      case UI_DIALOG_ATTRIBUTES.HIDE_X_BUTTON:
        this._setHideXButton(value !== null, { fromAttribute: true })
        break
      case UI_DIALOG_ATTRIBUTES.ALERT:
        this._setAlert(value !== null, { fromAttribute: true })
        break
    }
  }

  constructor() {
    super()
    this._instanceId = String(nextDialogId++)
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
    dialogRegistry.set(this._instanceId, this)
  }

  disconnectedCallback(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = null
    dialogRegistry.delete(this._instanceId)
  }

  private _setupListeners(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    this.addEventListener(UI_DIALOG_EVENTS.REQUEST_OPEN, this._onRequestOpen.bind(this), {
      signal: this._eventsAborter?.signal
    })
    this.addEventListener(UI_DIALOG_EVENTS.REQUEST_CLOSE, this._onRequestClose.bind(this), {
      signal: this._eventsAborter?.signal
    })
    this.addEventListener(UI_DIALOG_EVENTS.REQUEST_TOGGLE, this._onRequestToggle.bind(this), {
      signal: this._eventsAborter?.signal
    })
    this.addEventListener(UI_DIALOG_EVENTS.OPEN_CHANGE, this._onOpenChange.bind(this), {
      signal: this._eventsAborter?.signal
    })
  }

  private _init(): void {
    // Reflect id as an attribute so children (including portaled ones)
    // can discover their owning dialog via data-dialog-id.
    this.setAttribute(UI_DIALOG_ATTRIBUTES.INSTANCE_ID, String(this._instanceId))

    if (this.hasAttribute(UI_DIALOG_ATTRIBUTES.OPEN)) {
      this._setOpen(true, { fromAttribute: true })
    }
  }

  private _onRequestOpen(e: Event): void {
    const custom = e as CustomEvent<OpenEventDetail>
    const detailId = custom.detail?.dialogId
    // If a specific dialogId is provided and it doesn't match, ignore this request.
    if (detailId !== undefined && detailId !== this._instanceId) return
    this._setOpen(true)
  }

  private _onRequestClose(event: Event): void {
    const custom = event as CustomEvent<CloseEventDetail>
    const detailId = custom.detail?.dialogId
    // If a specific dialogId is provided and it doesn't match, ignore this request.
    if (detailId !== undefined && detailId !== this._instanceId) return

    this._setOpen(false)
  }

  private _onRequestToggle(e: Event): void {
    const custom = e as CustomEvent<ToggleEventDetail>
    const detailId = custom.detail?.dialogId
    // If a specific dialogId is provided and it doesn't match, ignore this request.
    if (detailId !== undefined && detailId !== this._instanceId) return

    this._setOpen(!this._open)
  }

  private _onOpenChange(e: Event): void {
    const custom = e as CustomEvent<OpenChangeEventDetail>
    if (custom.detail.dialogId !== this._instanceId) return
    if (!custom.detail.open) {
      dialogRegistry.delete(this._instanceId)
    }
  }

  private _setOpen(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._open === next) return
    this._open = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_DIALOG_ATTRIBUTES.OPEN, '')
      else this.removeAttribute(UI_DIALOG_ATTRIBUTES.OPEN)
    }

    this.dispatchEvent(
      new CustomEvent(UI_DIALOG_EVENTS.OPEN_CHANGE, {
        detail: { open: this._open },
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

  set showXButton(value: boolean) {
    this._setHideXButton(Boolean(value))
  }

  private _setHideXButton(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._hideXButton === next) return
    this._hideXButton = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_DIALOG_ATTRIBUTES.HIDE_X_BUTTON, '')
      else this.removeAttribute(UI_DIALOG_ATTRIBUTES.HIDE_X_BUTTON)
    }

    for (const listener of this._hideXButtonListeners) {
      try {
        listener(this._hideXButton)
      } catch {
        // ignore
      }
    }
  }

  get alert(): boolean {
    return this._alert
  }

  set alert(value: boolean) {
    this._setAlert(Boolean(value))
  }

  private _setAlert(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._alert === next) return
    this._alert = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_DIALOG_ATTRIBUTES.ALERT, '')
      else this.removeAttribute(UI_DIALOG_ATTRIBUTES.ALERT)
    }

    for (const listener of this._alertListeners) {
      try {
        listener(this._alert)
      } catch {
        // ignore
      }
    }
  }

  // Listener registration APIs. Each returns an unsubscribe function.
  onOpenChange(listener: (open: boolean) => void): () => void {
    this._openListeners.add(listener)
    return () => {
      this._openListeners.delete(listener)
    }
  }

  onHideXButtonChange(listener: (show: boolean) => void): () => void {
    this._hideXButtonListeners.add(listener)
    listener(this._hideXButton)
    return () => {
      this._hideXButtonListeners.delete(listener)
    }
  }

  onAlertChange(listener: (alert: boolean) => void): () => void {
    this._alertListeners.add(listener)
    return () => {
      this._alertListeners.delete(listener)
    }
  }
}

if (!customElements.get(UI_DIALOG_TAG_NAME)) {
  customElements.define(UI_DIALOG_TAG_NAME, UiDialog)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_TAG_NAME]: UiDialog
  }
}

export function ensureDialog(
  componentTreeRoot: HTMLElement,
  componentTag: string,
  options?: { shouldThrow: boolean }
): UiDialog | null {
  return ensureComponentWithRegistry<UiDialog>(
    componentTreeRoot,
    componentTag,
    UI_DIALOG_TAG_NAME,
    UI_DIALOG_ATTRIBUTES.INSTANCE_ID,
    dialogRegistry,
    options
  )
}
