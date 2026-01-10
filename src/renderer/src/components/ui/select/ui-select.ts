import { ensureComponentWithRegistry } from '@renderer/lib/ui/dom-utils'
import {
  CloseEventDetail,
  OpenChangeEventDetail,
  OpenEventDetail,
  ToggleEventDetail,
  UI_SELECT_ATTRIBUTES,
  UI_SELECT_EVENTS,
  UI_SELECT_TAG_NAME,
  UI_SELECT_TRIGGER_TAG_NAME,
  ValueChangeEventDetail
} from './constants'
import { UiSelectTrigger } from './ui-select-trigger'

// TODO: fix bug: when ui-select is form assciated, it doesn't recieve focus
// and when tabindex = -1, the browser is able to focus it, but this removes children<trigger>
// from keyboard tan sequence

let nextSelectId = 1

const selectRegistry = new Map<string, UiSelect>()

export class UiSelect extends HTMLElement {
  static formAssociated = true

  private _open = false
  private _value: string | null = null
  private _invalid: boolean = false
  private _touched: boolean = false
  private readonly _instanceId: string
  private readonly _internals: ElementInternals
  private _defaultValue: string | null = null
  private _eventsController: AbortController | null = null

  private _openListeners = new Set<(open: boolean) => void>()
  private _valueListeners = new Set<(value: string | null) => void>()
  private _invalidListeners = new Set<(invalid: boolean) => void>()
  private _disabledListeners = new Set<(disabled: boolean) => void>()

  static get observedAttributes(): string[] {
    return [
      UI_SELECT_ATTRIBUTES.OPEN,
      UI_SELECT_ATTRIBUTES.VALUE,
      UI_SELECT_ATTRIBUTES.NAME,
      UI_SELECT_ATTRIBUTES.REQUIRED,
      UI_SELECT_ATTRIBUTES.DISABLED
    ]
  }

  constructor() {
    super()
    this._instanceId = String(nextSelectId++)
    this._internals = this.attachInternals()
    this.attachShadow({ mode: 'open' })
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case UI_SELECT_ATTRIBUTES.OPEN:
        this._setOpen(value !== null, { fromAttribute: true })
        break
      case UI_SELECT_ATTRIBUTES.VALUE:
        this._setValue(value, { fromAttribute: true })
        break
      case UI_SELECT_ATTRIBUTES.NAME:
        this._syncFormValue()
        break
      case UI_SELECT_ATTRIBUTES.REQUIRED:
      case UI_SELECT_ATTRIBUTES.DISABLED:
        this._updateValidity()
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
    selectRegistry.set(this._instanceId, this)
  }

  disconnectedCallback(): void {
    this._eventsController?.abort()
    this._eventsController = null
    selectRegistry.delete(this._instanceId)
  }

  private _setupListeners(): void {
    this._eventsController?.abort()
    this._eventsController = new AbortController()
    const signal = this._eventsController.signal
    this.addEventListener(UI_SELECT_EVENTS.REQUEST_OPEN, this._onRequestOpen.bind(this), { signal })
    this.addEventListener(UI_SELECT_EVENTS.REQUEST_CLOSE, this._onRequestClose.bind(this), {
      signal
    })
    this.addEventListener(UI_SELECT_EVENTS.REQUEST_TOGGLE, this._onRequestToggle.bind(this), {
      signal
    })
    this.addEventListener(
      UI_SELECT_EVENTS.OPEN_CHANGE,
      this._onOpenChange.bind(this) as EventListener,
      { signal }
    )
    this.addEventListener(
      UI_SELECT_EVENTS.VALUE_CHANGE,
      this._onValueChange.bind(this) as EventListener,
      { signal }
    )
  }

  private _init(): void {
    // Reflect id so children (including portaled ones) can discover their
    // owning select via data-select-id.
    this.setAttribute(UI_SELECT_ATTRIBUTES.INSTANCE_ID, String(this._instanceId))

    if (this.hasAttribute(UI_SELECT_ATTRIBUTES.OPEN)) {
      this._setOpen(true, { fromAttribute: true })
    }

    if (this.hasAttribute(UI_SELECT_ATTRIBUTES.VALUE)) {
      const initial = this.getAttribute(UI_SELECT_ATTRIBUTES.VALUE)
      this._setValue(initial, { fromAttribute: true })
    }

    // Capture initial value for form reset behavior and sync form value
    // + validity on first connect.
    this._defaultValue = this._value
    this._syncFormValue()
    this._updateValidity()
  }

  private _onRequestOpen(e: Event): void {
    if (this.disabled) return
    const custom = e as CustomEvent<OpenEventDetail>
    const detailId = custom.detail?.selectId
    if (detailId !== undefined && detailId !== this._instanceId) return
    this._setOpen(true)
  }

  private _onRequestClose(event: Event): void {
    const custom = event as CustomEvent<CloseEventDetail>
    const detailId = custom.detail?.selectId
    if (detailId !== undefined && detailId !== this._instanceId) return
    this._setOpen(false)
  }

  private _onRequestToggle(e: Event): void {
    if (this.disabled) return
    const custom = e as CustomEvent<ToggleEventDetail>
    const detailId = custom.detail?.selectId
    if (detailId !== undefined && detailId !== this._instanceId) return
    this._setOpen(!this._open)
  }

  private _onOpenChange(e: Event): void {
    const custom = e as CustomEvent<OpenChangeEventDetail>
    if (custom.detail.selectId !== this._instanceId) return
    if (!custom.detail.open) {
      selectRegistry.delete(this._instanceId)
    }
  }

  private _onValueChange(e: Event): void {
    const custom = e as CustomEvent<ValueChangeEventDetail>
    const detailId = custom.detail?.selectId
    if (detailId !== undefined && detailId !== this._instanceId) return
    this._setValue(custom.detail.value ?? null)
  }

  private _setOpen(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._open === next) return
    this._open = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_SELECT_ATTRIBUTES.OPEN, '')
      else this.removeAttribute(UI_SELECT_ATTRIBUTES.OPEN)
    }

    this.dispatchEvent(
      new CustomEvent(UI_SELECT_EVENTS.OPEN_CHANGE, {
        detail: {
          open: this._open,
          selectId: this.instanceId
        } satisfies OpenChangeEventDetail,
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

  private _setValue(next: string | null, opts?: { fromAttribute?: boolean }): void {
    if (this._value === next) return
    this._value = next

    if (!opts?.fromAttribute) {
      if (next != null) this.setAttribute(UI_SELECT_ATTRIBUTES.VALUE, next)
      else this.removeAttribute(UI_SELECT_ATTRIBUTES.VALUE)
    }

    // Keep associated form value and validity in sync.
    this._syncFormValue()
    this._updateValidity()
    this.dispatchEvent(
      new CustomEvent(UI_SELECT_EVENTS.VALUE_CHANGE, {
        detail: {
          value: this._value,
          selectId: this.instanceId
        } satisfies ValueChangeEventDetail,
        bubbles: true,
        composed: true
      })
    )

    for (const listener of this._valueListeners) {
      try {
        listener(this._value)
      } catch {
        // ignore
      }
    }
  }

  get open(): boolean {
    return this._open
  }

  set open(value: boolean) {
    this._setOpen(Boolean(value))
  }

  get value(): string | null {
    return this._value
  }

  set value(next: string | null) {
    this._setValue(next)
  }

  get instanceId(): string {
    return this._instanceId
  }

  get name(): string | null {
    return this.getAttribute(UI_SELECT_ATTRIBUTES.NAME)
  }

  set name(value: string | null) {
    if (value == null) this.removeAttribute(UI_SELECT_ATTRIBUTES.NAME)
    else this.setAttribute(UI_SELECT_ATTRIBUTES.NAME, value)
  }

  get required(): boolean {
    return this.hasAttribute(UI_SELECT_ATTRIBUTES.REQUIRED)
  }

  set required(value: boolean) {
    if (value) this.setAttribute(UI_SELECT_ATTRIBUTES.REQUIRED, '')
    else this.removeAttribute(UI_SELECT_ATTRIBUTES.REQUIRED)
  }

  get disabled(): boolean {
    return this.hasAttribute(UI_SELECT_ATTRIBUTES.DISABLED)
  }

  set disabled(value: boolean) {
    if (value) this.setAttribute(UI_SELECT_ATTRIBUTES.DISABLED, '')
    else this.removeAttribute(UI_SELECT_ATTRIBUTES.DISABLED)
  }

  get touched(): boolean {
    return this._touched
  }

  set touched(value: boolean) {
    this._touched = value
    this._updateValidity()
  }

  get invalid(): boolean {
    return this._invalid
  }

  onOpenChange(listener: (open: boolean) => void): () => void {
    this._openListeners.add(listener)
    listener(this._open)
    return () => {
      this._openListeners.delete(listener)
    }
  }

  onValueChange(listener: (value: string | null) => void): () => void {
    this._valueListeners.add(listener)
    listener(this._value)
    return () => {
      this._valueListeners.delete(listener)
    }
  }

  onInvalidChange(listener: (invalid: boolean) => void): () => void {
    this._invalidListeners.add(listener)
    listener(this._invalid)
    return () => {
      this._invalidListeners.delete(listener)
    }
  }

  onDisabledChange(listener: (disabled: boolean) => void): () => void {
    this._disabledListeners.add(listener)
    listener(this.disabled)
    return () => {
      this._disabledListeners.delete(listener)
    }
  }

  get validity(): ValidityState {
    return this._internals.validity
  }

  get validationMessage(): string {
    return this._internals.validationMessage
  }

  checkValidity(): boolean {
    return this._internals.checkValidity()
  }

  reportValidity(): boolean {
    return this._internals.reportValidity()
  }

  setCustomValidity(message: string): void {
    if (message) {
      this._internals.setValidity({ customError: true }, message)
    } else {
      this._internals.setValidity({})
    }
  }

  // Form-associated callbacks and helpers.

  get form(): HTMLFormElement | null {
    return this._internals.form
  }

  // Delegate focus to the trigger element so when the browser focuses
  // this control (e.g. due to a validation error), the user lands on
  // the interactive trigger button.
  focus(options?: FocusOptions): void {
    const trigger = this.querySelector(UI_SELECT_TRIGGER_TAG_NAME) as UiSelectTrigger | null
    if (trigger) {
      trigger.focus(options)
      return
    }
    super.focus(options)
  }

  formResetCallback(): void {
    this.value = this._defaultValue
  }

  formStateRestoreCallback(state: string | null): void {
    this.value = state
  }

  private _syncFormValue(): void {
    // When name is missing, this control should not submit a value.
    if (!this.name) {
      this._internals.setFormValue(null)
      return
    }
    this._internals.setFormValue(this._value ?? null)
  }

  private _updateValidity(): void {
    if (!this.touched) return

    if (this.disabled) {
      this._internals.setValidity({})
      this._disabledListeners.forEach((listener) => listener(true))
      return
    }

    this._disabledListeners.forEach((listener) => listener(false))

    if (this.required && (this._value == null || this._value === '')) {
      this._internals.setValidity({ valueMissing: true }, 'Please select a value.')
      this._invalid = true
      this._invalidListeners.forEach((listener) => listener(this._invalid))
    } else {
      this._internals.setValidity({})
      this._invalid = false
      this._invalidListeners.forEach((listener) => listener(this._invalid))
    }
  }
}

if (!customElements.get(UI_SELECT_TAG_NAME)) {
  customElements.define(UI_SELECT_TAG_NAME, UiSelect)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SELECT_TAG_NAME]: UiSelect
  }
}

export function ensureSelect(
  componentTreeRoot: HTMLElement,
  componentTag: string,
  options?: { shouldThrow: boolean }
): UiSelect | null {
  return ensureComponentWithRegistry<UiSelect>(
    componentTreeRoot,
    componentTag,
    UI_SELECT_TAG_NAME,
    UI_SELECT_ATTRIBUTES.INSTANCE_ID,
    selectRegistry,
    options
  )
}
