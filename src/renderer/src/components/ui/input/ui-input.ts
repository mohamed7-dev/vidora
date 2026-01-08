import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import style from './ui-input.style.css?inline'
import html from './ui-input.template.html?raw'

const UI_INPUT_TAG_NAME = 'ui-input'
const ATTRIBUTES = {
  VALUE: 'value',
  PLACEHOLDER: 'placeholder',
  TYPE: 'type',
  DISABLED: 'disabled',
  REQUIRED: 'required',
  MIN: 'min',
  MAX: 'max',
  STEP: 'step',
  MIN_LENGTH: 'minlength',
  MAX_LENGTH: 'maxlength',
  PATTERN: 'pattern',
  VARIANT: 'variant',
  SIZE: 'size',
  AUTO_FOCUS: 'autofocus',
  NAME: 'name'
}
export type UIInputSizes = 'sm' | 'md' | 'lg' | 'default'
export type UIInputVariants = 'default' | 'underline'

export type UIInputValueDetail = { value: string }

export class UiInput extends HTMLElement {
  private static readonly tpl = createTemplateFromHtml(html)
  private static readonly sheet = createStyleSheetFromStyle(style)

  private _inputEl: HTMLInputElement | null = null
  private _internals: ElementInternals | null = null
  // Tracks the original value at the time the element was first connected,
  // similar to a native input's defaultValue.
  private _defaultValue: string | null = null
  private _eventsAborter: AbortController | null = null
  private _touched = false
  static formAssociated = true

  constructor() {
    super()
    this.attachShadow({ mode: 'open', delegatesFocus: true })
    if (this.attachInternals) {
      this._internals = this.attachInternals()
    }
  }

  //-------------------------------------Validation attribute mirroring-------------------------------------
  static get observedAttributes(): string[] {
    return [
      ATTRIBUTES.VALUE,
      ATTRIBUTES.PLACEHOLDER,
      ATTRIBUTES.TYPE,
      ATTRIBUTES.DISABLED,
      ATTRIBUTES.REQUIRED,
      ATTRIBUTES.MIN,
      ATTRIBUTES.MAX,
      ATTRIBUTES.STEP,
      ATTRIBUTES.MIN_LENGTH,
      ATTRIBUTES.MAX_LENGTH,
      ATTRIBUTES.PATTERN,
      ATTRIBUTES.AUTO_FOCUS
    ]
  }

  attributeChangedCallback(name: string): void {
    switch (name) {
      case ATTRIBUTES.VALUE:
        this._syncValue()
        break
      case ATTRIBUTES.PLACEHOLDER:
        this._syncPlaceholder()
        break
      case ATTRIBUTES.TYPE:
        this._syncType()
        break
      case ATTRIBUTES.DISABLED:
        this._syncDisabled()
        break
      case ATTRIBUTES.REQUIRED:
      case ATTRIBUTES.MIN:
      case ATTRIBUTES.MAX:
      case ATTRIBUTES.STEP:
      case ATTRIBUTES.MIN_LENGTH:
      case ATTRIBUTES.MAX_LENGTH:
      case ATTRIBUTES.PATTERN:
        this._syncValidationAttrs()
        // Constraint set changed: refresh ElementInternals validity so
        // the form sees the latest constraints even before
        // interaction.
        this._updateValidityFromInner()
        break
      case ATTRIBUTES.AUTO_FOCUS:
        this._syncAutoFocus()
    }
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
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
    this.shadowRoot.adoptedStyleSheets = [UiInput.sheet]
    this.shadowRoot.append(UiInput.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._inputEl = this.shadowRoot.querySelector('input') as HTMLInputElement | null
  }

  private _init(): void {
    if (this._defaultValue === null) {
      this._defaultValue = this.value ?? ''
    }
    this._syncValue()
    this._syncPlaceholder()
    this._syncDisabled()
    this._syncType()
    this._syncValidationAttrs()
    this.size = this.size ?? 'default'
    this.variant = this.variant ?? 'default'
    this._syncAutoFocus()
    // Keep internals' validity in sync from the beginning, but do not
    // mark the field as visually invalid until the user interacts.
    this._updateValidityFromInner()
  }

  private _bindEvents(): void {
    if (!this._inputEl) return
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal
    this._inputEl.addEventListener(
      'input',
      () => {
        this.value = this._inputEl?.value ?? ''
        this._internals?.setFormValue(this.value)
        this._touched = true
        this._updateValidityFromInner()
        this.dispatchEvent(
          new CustomEvent<UIInputValueDetail>('input', {
            bubbles: true,
            composed: true,
            detail: { value: this.value }
          })
        )
      },
      { signal }
    )
    this._inputEl.addEventListener(
      'change',
      () => {
        this.value = this._inputEl?.value ?? ''
        this._internals?.setFormValue(this.value)
        this._touched = true
        this._updateValidityFromInner()
        this.dispatchEvent(
          new CustomEvent<UIInputValueDetail>('change', {
            bubbles: true,
            composed: true,
            detail: { value: this.value }
          })
        )
      },
      { signal }
    )

    // Forward focus/blur for a11y
    this._inputEl.addEventListener(
      'focus',
      (e: FocusEvent) => {
        this.dispatchEvent(
          new FocusEvent('focus', {
            bubbles: true,
            composed: true,
            relatedTarget: e.relatedTarget as EventTarget | null
          })
        )
      },
      { signal }
    )
    this._inputEl.addEventListener(
      'blur',
      (e: FocusEvent) => {
        this._touched = true
        this._updateValidityFromInner()
        this.dispatchEvent(
          new FocusEvent('blur', {
            bubbles: true,
            composed: true,
            relatedTarget: e.relatedTarget as EventTarget | null
          })
        )
      },
      { signal }
    )

    this._inputEl.addEventListener(
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          // Let the associated form handle a normal validated submit
          const form = this._internals?.form
          if (form) {
            event.preventDefault()
            form.requestSubmit()
          }
        }
      },
      { signal }
    )
  }

  // Mirror validity from the inner input into ElementInternals and the
  // derived "invalid" state on the host. This keeps the custom element
  // in sync with native constraint validation.
  private _updateValidityFromInner(): void {
    if (!this._inputEl || !this._internals) return

    const validity = this._inputEl.validity
    const message = this._inputEl.validationMessage
    if (validity.valid) {
      this._internals.setValidity({})
      // Only clear visual invalid state if the user has interacted.
      if (this._touched) {
        this._inputEl.removeAttribute('aria-invalid')
        this._inputEl.removeAttribute('aria-errormessage')
      }
    } else {
      this._internals.setValidity(validity, message, this._inputEl)
      // Keep visual invalid state gated behind user interaction. The
      // form will still respect the invalid state via ElementInternals.
      if (this._touched) {
        this._inputEl.setAttribute('aria-invalid', 'true')
      }
    }
  }
  //-------------------------------------Sync States-------------------------------------
  private _syncValue(): void {
    if (!this._inputEl) return
    this._inputEl.value = this.value
  }

  private _syncPlaceholder(): void {
    if (!this._inputEl) return
    if (this.placeholder) {
      this._inputEl.placeholder = this.placeholder
    }
  }

  private _syncType(): void {
    if (!this._inputEl) return
    this._inputEl.type = this.type
  }

  private _syncDisabled(): void {
    if (!this._inputEl) return
    this._inputEl.disabled = this.disabled
  }

  private _syncAutoFocus(): void {
    // Support autofocus semantics even within dialogs by focusing after mount
    if (this.autofocus) {
      requestAnimationFrame(() => this.focus())
    }
  }

  private _syncValidationAttrs(): void {
    if (!this._inputEl) return

    if (this.required) {
      this._inputEl.required = this.required
    }

    if (this.hasAttribute(ATTRIBUTES.MIN)) {
      this._inputEl.min = this.getAttribute(ATTRIBUTES.MIN) ?? ''
    }

    if (this.hasAttribute(ATTRIBUTES.MAX)) {
      this._inputEl.max = this.getAttribute(ATTRIBUTES.MAX) ?? ''
    }

    if (this.hasAttribute(ATTRIBUTES.STEP)) {
      this._inputEl.step = this.getAttribute(ATTRIBUTES.STEP) ?? ''
    }

    const minLenAttr = this.getAttribute(ATTRIBUTES.MIN_LENGTH)
    const maxLenAttr = this.getAttribute(ATTRIBUTES.MAX_LENGTH)

    if (this.hasAttribute(ATTRIBUTES.MIN_LENGTH) && minLenAttr != null) {
      const n = Number(minLenAttr)
      if (!Number.isNaN(n) && n >= 0) {
        this._inputEl.minLength = n
      }
    }

    if (this.hasAttribute(ATTRIBUTES.MAX_LENGTH) && maxLenAttr != null) {
      const n = Number(maxLenAttr)
      if (!Number.isNaN(n) && n >= 0) {
        this._inputEl.maxLength = n
      }
    }

    if (this.hasAttribute(ATTRIBUTES.PATTERN)) {
      this._inputEl.pattern = this.getAttribute(ATTRIBUTES.PATTERN) ?? ''
    }
  }

  //-------------------------------------Public API-------------------------------------

  /**
   * Called by the browser when the containing form is reset.
   * Restores the value to its initial attribute, clears invalid state,
   * and updates the form-associated value.
   */
  formResetCallback(): void {
    const initial = this._defaultValue ?? ''
    this.value = initial
    if (this._inputEl) {
      this._inputEl.value = initial
    }
    this._internals?.setFormValue(this.value)
    this._updateValidityFromInner()
  }

  get form(): HTMLFormElement | null {
    return this._internals?.form ?? null
  }

  get validity(): ValidityState {
    return this._internals?.validity ?? (this._inputEl?.validity as ValidityState)
  }

  get validationMessage(): string {
    return this._internals?.validationMessage ?? this._inputEl?.validationMessage ?? ''
  }

  checkValidity(): boolean {
    return this._internals?.checkValidity() ?? this._inputEl?.checkValidity() ?? true
  }

  reportValidity(): boolean {
    return this._internals?.reportValidity() ?? this._inputEl?.reportValidity() ?? true
  }

  setCustomValidity(message: string): void {
    if (!this._internals) return
    if (message) {
      this._internals.setValidity({ customError: true }, message, this._inputEl ?? undefined)
      this._inputEl?.setAttribute('aria-invalid', 'true')
    } else {
      this._internals.setValidity({})
      this._inputEl?.removeAttribute('aria-invalid')
    }
  }

  focus(options?: FocusOptions): void {
    this._inputEl?.focus(options)
  }

  blur(): void {
    this._inputEl?.blur()
  }

  select(): void {
    this._inputEl?.select()
  }

  get value(): string {
    return this.getAttribute(ATTRIBUTES.VALUE) ?? ''
  }
  set value(v: string) {
    this.setAttribute(ATTRIBUTES.VALUE, v)
  }

  get placeholder(): string | null {
    return this.getAttribute(ATTRIBUTES.PLACEHOLDER)
  }
  set placeholder(v: string | null) {
    if (v === null) this.removeAttribute(ATTRIBUTES.PLACEHOLDER)
    else this.setAttribute(ATTRIBUTES.PLACEHOLDER, v)
  }

  get type(): HTMLInputElement['type'] {
    return (this.getAttribute(ATTRIBUTES.TYPE) as HTMLInputElement['type']) ?? 'text'
  }
  set type(v: HTMLInputElement['type']) {
    this.setAttribute(ATTRIBUTES.TYPE, v)
  }

  get disabled(): boolean {
    return this.hasAttribute(ATTRIBUTES.DISABLED)
  }
  set disabled(v: boolean) {
    if (v) this.setAttribute(ATTRIBUTES.DISABLED, '')
    else this.removeAttribute(ATTRIBUTES.DISABLED)
  }

  get size(): UIInputSizes {
    return (this.getAttribute(ATTRIBUTES.SIZE) as UIInputSizes) ?? 'default'
  }
  set size(v: UIInputSizes) {
    this.setAttribute(ATTRIBUTES.SIZE, v ?? 'default')
  }

  get variant(): UIInputVariants {
    return (this.getAttribute(ATTRIBUTES.VARIANT) as UIInputVariants) ?? 'default'
  }
  set variant(v: UIInputVariants) {
    this.setAttribute(ATTRIBUTES.VARIANT, v ?? 'default')
  }

  get autofocus(): boolean {
    return this.hasAttribute(ATTRIBUTES.AUTO_FOCUS)
  }
  set autofocus(v: boolean) {
    if (v) this.setAttribute(ATTRIBUTES.AUTO_FOCUS, '')
    else this.removeAttribute(ATTRIBUTES.AUTO_FOCUS)
  }

  get name(): string | null {
    return this.getAttribute(ATTRIBUTES.NAME)
  }
  set name(v: string | null) {
    if (v == null) this.removeAttribute(ATTRIBUTES.NAME)
    else this.setAttribute(ATTRIBUTES.NAME, v)
  }

  get required(): boolean {
    return this.hasAttribute(ATTRIBUTES.REQUIRED)
  }
  set required(v: boolean) {
    if (v) this.setAttribute(ATTRIBUTES.REQUIRED, '')
    else this.removeAttribute(ATTRIBUTES.REQUIRED)
  }
}

if (!customElements.get(UI_INPUT_TAG_NAME)) {
  customElements.define(UI_INPUT_TAG_NAME, UiInput)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_INPUT_TAG_NAME]: UiInput
  }
}
