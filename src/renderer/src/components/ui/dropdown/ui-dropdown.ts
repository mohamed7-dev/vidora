import { ensureComponentWithRegistry } from '@renderer/lib/ui/dom-utils'
import {
  CloseEventDetail,
  OpenChangeEventDetail,
  ToggleEventDetail,
  UI_DROPDOWN_ATTRIBUTES,
  UI_DROPDOWN_EVENTS,
  UI_DROPDOWN_TAG_NAME,
  UI_DROPDOWN_TRIGGER_TAG_NAME
} from './constants'
import type { UiDropdownTrigger } from './ui-dropdown-trigger'

let nextDropdownId = 1

const dropdownRegistry = new Map<string, UiDropdown>()

export class UiDropdown extends HTMLElement {
  private _open = false
  private readonly _instanceId: string
  private _eventsController: AbortController | null = null

  private _openListeners = new Set<(open: boolean) => void>()
  private _disabledListeners = new Set<(disabled: boolean) => void>()

  static get observedAttributes(): string[] {
    return [UI_DROPDOWN_ATTRIBUTES.OPEN, UI_DROPDOWN_ATTRIBUTES.DISABLED]
  }

  constructor() {
    super()
    this._instanceId = `${nextDropdownId++}`
    this.attachShadow({ mode: 'open' })
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case UI_DROPDOWN_ATTRIBUTES.OPEN:
        this._setOpen(value !== null, { fromAttribute: true })
        break
      case UI_DROPDOWN_ATTRIBUTES.DISABLED:
        this._notifyDisabled()
        break
    }
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
    dropdownRegistry.set(this._instanceId, this)
  }

  disconnectedCallback(): void {
    this._eventsController?.abort()
    this._eventsController = null
    dropdownRegistry.delete(this._instanceId)
  }

  private _setupListeners(): void {
    this._eventsController?.abort()
    this._eventsController = new AbortController()
    const signal = this._eventsController.signal
    this.addEventListener(UI_DROPDOWN_EVENTS.OPEN_CHANGE, this._onOpenChange.bind(this), { signal })
    this.addEventListener(UI_DROPDOWN_EVENTS.REQUEST_OPEN, this._onRequestOpen.bind(this), {
      signal
    })
    this.addEventListener(UI_DROPDOWN_EVENTS.REQUEST_CLOSE, this._onRequestClose.bind(this), {
      signal
    })
    this.addEventListener(UI_DROPDOWN_EVENTS.REQUEST_TOGGLE, this._onRequestToggle.bind(this), {
      signal
    })
  }

  private _init(): void {
    // Reflect id so children (including portaled ones) can discover their
    // owning dropdown via data attribute.
    this.setAttribute(UI_DROPDOWN_ATTRIBUTES.INSTANCE_ID, String(this._instanceId))

    if (this.hasAttribute(UI_DROPDOWN_ATTRIBUTES.OPEN)) {
      this._setOpen(true, { fromAttribute: true })
    }

    this._notifyDisabled()
  }

  private _onRequestOpen(): void {
    if (this.disabled) return
    this._setOpen(true)
  }

  private _onRequestClose(e: Event): void {
    const custom = e as CustomEvent<CloseEventDetail>
    const detailId = custom.detail?.menuId
    // If a specific menuId is provided and it doesn't match, ignore this request.
    if (detailId !== undefined && detailId !== this._instanceId) return
    this._setOpen(false)
  }

  private _onRequestToggle(e: Event): void {
    const custom = e as CustomEvent<ToggleEventDetail>
    const detailId = custom.detail?.menuId
    // If a specific menuId is provided and it doesn't match, ignore this request.
    if (detailId !== undefined && detailId !== this._instanceId) return
    this._setOpen(!this._open)
  }

  private _onOpenChange(e: Event): void {
    const custom = e as CustomEvent<OpenChangeEventDetail>
    if (custom.detail.menuId !== this._instanceId) return
    if (!custom.detail.open) {
      dropdownRegistry.delete(this._instanceId)
    }
  }

  private _setOpen(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._open === next) return
    this._open = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_DROPDOWN_ATTRIBUTES.OPEN, '')
      else this.removeAttribute(UI_DROPDOWN_ATTRIBUTES.OPEN)
    }

    this.dispatchEvent(
      new CustomEvent(UI_DROPDOWN_EVENTS.OPEN_CHANGE, {
        detail: { open: this._open },
        bubbles: true,
        composed: true
      })
    )

    for (const listener of this._openListeners) {
      try {
        listener(this._open)
      } catch {
        // ignore
      }
    }
  }

  private _notifyDisabled(): void {
    const disabled = this.disabled
    for (const listener of this._disabledListeners) {
      try {
        listener(disabled)
      } catch {
        // ignore
      }
    }
  }

  //---------------------------Public API---------------------------
  get open(): boolean {
    return this._open
  }

  set open(value: boolean) {
    this._setOpen(Boolean(value))
  }

  get instanceId(): string {
    return this._instanceId
  }

  get disabled(): boolean {
    return this.hasAttribute(UI_DROPDOWN_ATTRIBUTES.DISABLED)
  }

  set disabled(value: boolean) {
    if (value) this.setAttribute(UI_DROPDOWN_ATTRIBUTES.DISABLED, '')
    else this.removeAttribute(UI_DROPDOWN_ATTRIBUTES.DISABLED)
  }

  onOpenChange(listener: (open: boolean) => void): () => void {
    this._openListeners.add(listener)
    listener(this._open)
    return () => {
      this._openListeners.delete(listener)
    }
  }

  onDisabledChange(listener: (disabled: boolean) => void): () => void {
    this._disabledListeners.add(listener)
    listener(this.disabled)
    return () => {
      this._disabledListeners.delete(listener)
    }
  }

  focus(options?: FocusOptions): void {
    const trigger = this.querySelector(UI_DROPDOWN_TRIGGER_TAG_NAME) as UiDropdownTrigger | null
    if (trigger) {
      trigger.focus(options)
      return
    }
    super.focus(options)
  }
}

if (!customElements.get(UI_DROPDOWN_TAG_NAME)) {
  customElements.define(UI_DROPDOWN_TAG_NAME, UiDropdown)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DROPDOWN_TAG_NAME]: UiDropdown
  }
}

export function ensureDropdown(
  componentTreeRoot: HTMLElement,
  componentTag: string,
  options?: { shouldThrow: boolean }
): UiDropdown | null {
  return ensureComponentWithRegistry<UiDropdown>(
    componentTreeRoot,
    componentTag,
    UI_DROPDOWN_TAG_NAME,
    UI_DROPDOWN_ATTRIBUTES.INSTANCE_ID,
    dropdownRegistry,
    options
  )
}
