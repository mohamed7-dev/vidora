import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import style from './ui-checkbox.style.css?inline'
import html from './ui-checkbox.template.html?raw'

const UI_CHECKBOX_TAG_NAME = 'ui-checkbox'

const UI_CHECKBOX_ATTRIBUTES = {
  CHECKED: 'checked',
  DISABLED: 'disabled',
  VARIANT: 'variant',
  SIZE: 'size',
  AUTO_FOCUS: 'autofocus',
  INVALID: 'invalid',
  REQUIRED: 'required'
}

export type UICheckValueDetail = { checked: boolean }
export type UICheckboxVariants = 'default' | 'secondary' | 'destructive' | 'outline'

export type UICheckboxSizes = 'default' | 'sm' | 'lg'

export class UICheckbox extends HTMLElement {
  private static readonly tpl = createTemplateFromHtml(html)
  private static readonly sheet = createStyleSheetFromStyle(style)

  static formAssociated = true
  private _internals: ElementInternals | null = null
  private _eventsAborter: AbortController | null = null
  private _defaultChecked = false
  private _touched = false
  private _customValidityFlags: ValidityStateFlags | null = null
  private _customValidityMessage = ''

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    if (this.attachInternals) {
      this._internals = this.attachInternals()
    }
  }

  static get observedAttributes(): string[] {
    return Object.values(UI_CHECKBOX_ATTRIBUTES)
  }

  attributeChangedCallback(name: string): void {
    switch (name) {
      case UI_CHECKBOX_ATTRIBUTES.CHECKED:
        this._syncChecked()
        break
      case UI_CHECKBOX_ATTRIBUTES.DISABLED:
        this._syncDisabled()
        break
      case UI_CHECKBOX_ATTRIBUTES.INVALID:
        this._syncInvalid()
        break
      case UI_CHECKBOX_ATTRIBUTES.REQUIRED:
        this._syncRequired()
        break
      case UI_CHECKBOX_ATTRIBUTES.AUTO_FOCUS:
        this._syncAutoFocus()
    }
  }

  connectedCallback(): void {
    this._render()
    this._init()
    this._bindEvents()
  }

  disconnectedCallback(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UICheckbox.sheet]
    this.shadowRoot.append(UICheckbox.tpl.content.cloneNode(true))
  }

  private _init(): void {
    this._syncChecked()
    this._syncDisabled()
    this._syncRequired()
    this._syncAutoFocus()
    if (!this.variant) this.variant = 'default'
    if (!this.size) this.size = 'default'
    this.setAttribute('role', 'checkbox')
    // Ensure focusability on first connection when not disabled
    this.tabIndex = this.disabled ? -1 : 0
    this.setAttribute('tabindex', this.disabled ? '-1' : '0')
    this._defaultChecked = this.checked
    this._validate()
  }

  private _bindEvents(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal

    this.addEventListener(
      'click',
      () => {
        if (this.disabled) return
        this.toggleChecked()
        this._reflectValue()
        this._touched = true
        this._validate()
        this._emitChange()
      },
      { signal }
    )

    this.addEventListener(
      'keydown',
      (e) => {
        if (this.disabled) return
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Space') {
          e.preventDefault()
          this.toggleChecked()
          this._reflectValue()
          this._touched = true
          this._validate()
          this._emitChange()
        }
      },
      { signal }
    )

    // Forward focus/blur for a11y
    this.addEventListener(
      'blur',
      () => {
        this._touched = true
        this.invalid = !this._internals?.validity.valid
      },
      { signal }
    )
  }

  private _emitChange(): void {
    this.dispatchEvent(
      new CustomEvent<UICheckValueDetail>('change', {
        bubbles: true,
        composed: true,
        detail: { checked: this.checked }
      })
    )
  }

  private _reflectValue(): void {
    const formValue = this.checked ? (this.getAttribute('value') ?? 'on') : null
    this._internals?.setFormValue(formValue)
  }

  private _validate(): void {
    if (!this._internals) return
    const flags: ValidityStateFlags = {}
    let message = ''

    // Built-in `required` handling
    if (this.required && !this.checked) {
      flags.valueMissing = true
      message = 'Please, check this box'
    }

    // Merge any custom validity flags/message
    if (this._customValidityFlags) {
      Object.assign(flags, this._customValidityFlags)
      message = this._customValidityMessage
    }

    this._internals.setValidity(flags, message)

    if (this._touched) {
      if (this._internals.validity.valid) {
        this.removeAttribute('aria-invalid')
        this.removeAttribute('aria-errormessage')
      } else {
        this.setAttribute('aria-invalid', 'true')
      }
    }
  }

  //---------------------------Sync States-------------------------
  private _syncChecked(): void {
    this.setAttribute('aria-checked', String(this.checked))
    this._reflectValue()
  }

  private _syncDisabled(): void {
    this.setAttribute('aria-disabled', String(this.disabled))
    this.tabIndex = this.disabled ? -1 : 0
    this.setAttribute('tabindex', this.disabled ? '-1' : '0')
  }

  private _syncInvalid(): void {
    // this invalid attribute is only used for validating the checkbox(manually)
    this._validate()
  }

  private _syncAutoFocus(): void {
    if (this.hasAttribute(UI_CHECKBOX_ATTRIBUTES.AUTO_FOCUS)) {
      requestAnimationFrame(() => this.focus())
    }
  }

  private _syncRequired(): void {
    this.setAttribute('aria-required', String(this.required))
    this._validate()
  }

  //----------------------------Public API-------------------------
  focus(options?: FocusOptions): void {
    super.focus(options)
  }

  blur(): void {
    super.blur()
    this._syncInvalid()
  }

  get checked(): boolean {
    return this.hasAttribute(UI_CHECKBOX_ATTRIBUTES.CHECKED)
  }

  set checked(val: boolean) {
    this.toggleAttribute(UI_CHECKBOX_ATTRIBUTES.CHECKED, !!val)
  }

  toggleChecked(): void {
    this.checked = !this.checked
  }

  get disabled(): boolean {
    return this.hasAttribute(UI_CHECKBOX_ATTRIBUTES.DISABLED)
  }

  set disabled(val: boolean) {
    this.toggleAttribute(UI_CHECKBOX_ATTRIBUTES.DISABLED, !!val)
  }

  // Form-associated custom element hooks
  formResetCallback(): void {
    this.checked = this._defaultChecked
    this._syncChecked()
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled
    this._syncDisabled()
  }

  get form(): HTMLFormElement | null {
    return this._internals?.form ?? null
  }

  get validity(): ValidityState {
    return this._internals?.validity as ValidityState
  }

  get validationMessage(): string {
    return this._internals?.validationMessage ?? ''
  }

  checkValidity(): boolean {
    return this._internals?.checkValidity() ?? true
  }

  reportValidity(): boolean {
    return this._internals?.reportValidity() ?? true
  }

  setCustomValidity(message: string, flags?: ValidityStateFlags): void {
    if (!this._internals) return
    if (message) {
      this._customValidityFlags = { ...(flags ?? {}) }
      this._customValidityMessage = message
    } else {
      this._customValidityFlags = null
      this._customValidityMessage = ''
    }
    this._validate()
  }

  get variant(): UICheckboxVariants {
    return this.getAttribute(UI_CHECKBOX_ATTRIBUTES.VARIANT) as UICheckboxVariants
  }

  set variant(val: UICheckboxVariants) {
    this.setAttribute(UI_CHECKBOX_ATTRIBUTES.VARIANT, val ?? 'default')
  }

  get size(): UICheckboxSizes {
    return this.getAttribute(UI_CHECKBOX_ATTRIBUTES.SIZE) as UICheckboxSizes
  }

  set size(val: UICheckboxSizes) {
    this.setAttribute(UI_CHECKBOX_ATTRIBUTES.SIZE, val ?? 'default')
  }

  get invalid(): boolean {
    return this.hasAttribute(UI_CHECKBOX_ATTRIBUTES.INVALID)
  }
  set invalid(v: boolean) {
    if (v) this.setAttribute(UI_CHECKBOX_ATTRIBUTES.INVALID, '')
    else this.removeAttribute(UI_CHECKBOX_ATTRIBUTES.INVALID)
  }

  get required(): boolean {
    return this.hasAttribute(UI_CHECKBOX_ATTRIBUTES.REQUIRED)
  }
  set required(v: boolean) {
    if (v) this.setAttribute(UI_CHECKBOX_ATTRIBUTES.REQUIRED, '')
    else this.removeAttribute(UI_CHECKBOX_ATTRIBUTES.REQUIRED)
  }
}

if (!customElements.get(UI_CHECKBOX_TAG_NAME)) {
  customElements.define(UI_CHECKBOX_TAG_NAME, UICheckbox)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_CHECKBOX_TAG_NAME]: UICheckbox
  }
}
