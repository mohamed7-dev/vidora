import template from './template.html?raw'
import style from './style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../lib/template-loader'

const UI_INPUT_NAME = 'ui-input'
const ATTRIBUTES = {
  VALUE: 'value',
  PLACEHOLDER: 'placeholder',
  TYPE: 'type',
  DISABLED: 'disabled',
  INVALID: 'invalid',
  VARIANT: 'variant',
  SIZE: 'size',
  AUTO_FOCUS: 'autofocus'
}
export type UIInputSizes = 'sm' | 'md' | 'lg' | 'default'
export type UIInputVariants = 'default' | 'underline'

export type UIInputValueDetail = { value: string }

export class UIInput extends HTMLElement {
  private static readonly _template: HTMLTemplateElement = createTemplateFromHtml(template)
  private static readonly _sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static _idCounter = 0
  private _inputEl: HTMLInputElement | null = null
  private _labelEl: HTMLElement | null = null
  private _descriptionEl: HTMLElement | null = null
  private _errorEl: HTMLElement | null = null
  private _labelSlot: HTMLSlotElement | null = null
  private _descriptionSlot: HTMLSlotElement | null = null
  private _errorSlot: HTMLSlotElement | null = null
  // states
  private _attrObserver: MutationObserver | null = null
  private _eventsAborter: AbortController | null = null
  private _internals: ElementInternals | null = null
  // Tracks the original value at the time the element was first connected,
  // similar to a native input's defaultValue.
  private _defaultValue: string | null = null

  static formAssociated = true

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
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
      case ATTRIBUTES.INVALID:
        this._syncInvalid()
        break
      case ATTRIBUTES.AUTO_FOCUS:
        this._syncAutoFocus()
    }
  }
  constructor() {
    super()
    this.attachShadow({ mode: 'open', delegatesFocus: true })
    if (this.attachInternals) {
      this._internals = this.attachInternals()
    }
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()

    // Capture the initial default value once, based on the initial attribute.
    if (this._defaultValue === null) {
      this._defaultValue = this.getAttribute(ATTRIBUTES.VALUE) ?? ''
    }

    this._syncWrapperVisibility()
    this._wireA11y()
    this._bindEvents()
    this._syncAllAttributesToInner()
    this._observeAttributeChanges()

    // sync attributes
    this._syncValue()
    this._syncPlaceholder()
    this._syncDisabled()
    this._syncInvalid()
    this._syncType()
    this.size = this.size ?? 'default'
    this.variant = this.variant ?? 'default'
    this._syncAutoFocus()
  }

  disconnectedCallback(): void {
    this._attrObserver?.disconnect()
    this._attrObserver = null
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UIInput._sheet]
    const frag = UIInput._template.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.append(frag)
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._inputEl = this.shadowRoot.querySelector('input') as HTMLInputElement | null
    this._labelEl = this.shadowRoot.querySelector('[data-el="label"]') as HTMLElement | null
    this._descriptionEl = this.shadowRoot.querySelector(
      '[data-el="description"]'
    ) as HTMLElement | null
    this._errorEl = this.shadowRoot.querySelector('[data-el="error"]') as HTMLElement | null
    this._labelSlot = this.shadowRoot!.querySelector('slot[name="label"]')
    this._descriptionSlot = this.shadowRoot!.querySelector('slot[name="description"]')
    this._errorSlot = this.shadowRoot!.querySelector('slot[name="error"]')
  }

  private _wireA11y(): void {
    if (!this._inputEl) return

    const idBase = `${UI_INPUT_NAME}-${UIInput._idCounter++}`

    if (!this._inputEl.id) {
      this._inputEl.id = `${idBase}-input`
    }

    if (this._labelEl) {
      if (!this._labelEl.id) {
        this._labelEl.id = `${idBase}-label`
      }
      this._inputEl.setAttribute('aria-labelledby', this._labelEl.id)
    }

    const describedByIds: string[] = []
    if (this._descriptionEl) {
      if (!this._descriptionEl.id) {
        this._descriptionEl.id = `${idBase}-description`
      }
      describedByIds.push(this._descriptionEl.id)
    }
    if (this._errorEl) {
      if (!this._errorEl.id) {
        this._errorEl.id = `${idBase}-error`
      }
      describedByIds.push(this._errorEl.id)
    }

    if (describedByIds.length > 0) {
      this._inputEl.setAttribute('aria-describedby', describedByIds.join(' '))
    }
  }
  private _bindEvents(): void {
    if (!this._inputEl) return
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal
    this._labelSlot?.addEventListener('slotchange', () => this._syncWrapperVisibility())
    this._descriptionSlot?.addEventListener('slotchange', () => this._syncWrapperVisibility())
    this._errorSlot?.addEventListener('slotchange', () => this._syncWrapperVisibility())
    this._inputEl.addEventListener(
      'input',
      () => {
        this.value = this._inputEl?.value ?? ''
        this._internals?.setFormValue(this.value)
        this.invalid = !this._inputEl?.validity.valid
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
        this.invalid = !this._inputEl?.validity.valid
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
        this.invalid = !this._inputEl?.validity.valid
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
  }

  private _syncWrapperVisibility(): void {
    const hasSlotContent = (slot: HTMLSlotElement | null): boolean =>
      (slot?.assignedNodes({ flatten: true }) ?? []).some(
        (n) => !(n.nodeType === Node.TEXT_NODE && n.textContent?.trim() === '')
      )

    if (this._labelEl) {
      this._labelEl.hidden = !hasSlotContent(this._labelSlot)
    }
    if (this._descriptionEl) {
      this._descriptionEl.hidden = !hasSlotContent(this._descriptionSlot)
    }
    if (this._errorEl) {
      // Error is only shown when there's content AND the field is invalid
      this._errorEl.hidden = !this.invalid || !hasSlotContent(this._errorSlot)
    }
  }

  // Mirror all host attributes (except a small denylist) to internal input
  private _observeAttributeChanges(): void {
    if (this._attrObserver) return
    this._attrObserver = new MutationObserver(() => this._syncAllAttributesToInner())
    this._attrObserver.observe(this, { attributes: true })
  }

  private _syncAllAttributesToInner(): void {
    if (!this._inputEl) return
    const deny = new Set([
      'id',
      'class',
      'style',
      'slot',
      // managed internally for validity/a11y
      'aria-invalid',
      'aria-errormessage',
      ...Object.values(ATTRIBUTES)
    ])

    // Remove attributes absent on host
    for (const attr of Array.from(this._inputEl.attributes)) {
      if (deny.has(attr.name)) continue
      if (!this.hasAttribute(attr.name)) this._inputEl.removeAttribute(attr.name)
    }
    // Mirror from host
    for (const attr of Array.from(this.attributes)) {
      const name = attr.name
      if (deny.has(name)) continue
      const value = attr.value
      if (value === '' || value === name) this._inputEl.setAttribute(name, '')
      else this._inputEl.setAttribute(name, value)
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

  private _syncInvalid(): void {
    if (!this._inputEl) return
    if (this.invalid) {
      this._inputEl.setAttribute('aria-invalid', 'true')
      this._internals?.setValidity({ customError: true }, 'Invalid', this._inputEl)
      if (this._errorEl?.id) {
        this._inputEl.setAttribute('aria-errormessage', this._errorEl.id)
      }
    } else {
      this._inputEl.removeAttribute('aria-invalid')
      this._inputEl.removeAttribute('aria-errormessage')
      this._internals?.setValidity({})
    }
  }

  private _syncAutoFocus(): void {
    // Support autofocus semantics even within dialogs by focusing after mount
    if (this.hasAttribute('autofocus')) {
      requestAnimationFrame(() => this.focus())
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
    this.invalid = false
    this._internals?.setFormValue(this.value)
    this._syncWrapperVisibility()
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

  get invalid(): boolean {
    return this.hasAttribute(ATTRIBUTES.INVALID)
  }
  set invalid(v: boolean) {
    if (v) this.setAttribute(ATTRIBUTES.INVALID, '')
    else this.removeAttribute(ATTRIBUTES.INVALID)
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
}
if (!customElements.get(UI_INPUT_NAME)) {
  customElements.define(UI_INPUT_NAME, UIInput)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_INPUT_NAME]: UIInput
  }

  interface HTMLFormControlsCollection {
    [UI_INPUT_NAME]: UIInput
  }
}
