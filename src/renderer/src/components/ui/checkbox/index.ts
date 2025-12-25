import template from './template.html?raw'
import style from './style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../lib/template-loader'

const UI_CHECKBOX_NAME = 'ui-checkbox'

const ATTRIBUTES = {
  CHECKED: 'checked',
  DISABLED: 'disabled',
  VARIANT: 'variant',
  SIZE: 'size',
  AUTO_FOCUS: 'autofocus',
  INVALID: 'invalid'
}
export type UIInputValueDetail = { checked: boolean }
export type UICheckboxVariants = 'default' | 'secondary' | 'destructive' | 'outline'
export type UICheckboxSizes = 'default' | 'sm' | 'lg'

export class UICheckbox extends HTMLElement {
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(template)
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)

  //refs
  // private _inputEl: HTMLInputElement | null = null
  private _labelEl: HTMLElement | null = null
  private _descriptionEl: HTMLElement | null = null
  private _errorEl: HTMLElement | null = null
  private _fieldEl: HTMLElement | null = null
  private _labelSlot: HTMLSlotElement | null = null
  private _descriptionSlot: HTMLSlotElement | null = null
  private _errorSlot: HTMLSlotElement | null = null
  //states
  static formAssociated = true
  private _internals: ElementInternals | null = null
  private _eventsAborter: AbortController | null = null
  private static _idCounter = 0
  private _defaultChecked = false
  private _errorMessage: string = 'Invalid Value'

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
  }

  attributeChangedCallback(name: string): void {
    switch (name) {
      case ATTRIBUTES.CHECKED:
        this._syncChecked()
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
    this.attachShadow({ mode: 'open' })
    if (this.attachInternals) {
      this._internals = this.attachInternals()
    }
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._syncWrapperVisibility()
    this._wireA11y()
    this._init()

    this._setupListeners()
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

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._labelEl = this.shadowRoot.querySelector('[data-el="label"]') as HTMLElement | null
    this._descriptionEl = this.shadowRoot.querySelector(
      '[data-el="description"]'
    ) as HTMLElement | null
    this._errorEl = this.shadowRoot.querySelector('[data-el="error"]') as HTMLElement | null
    this._fieldEl = this.shadowRoot.querySelector('[data-el="field"]') as HTMLElement | null
    this._labelSlot = this.shadowRoot!.querySelector('slot[name="label"]')
    this._descriptionSlot = this.shadowRoot!.querySelector('slot[name="description"]')
    this._errorSlot = this.shadowRoot!.querySelector('slot[name="error"]')
  }

  private _init(): void {
    this._syncChecked()
    this._syncDisabled()
    this._syncInvalid()
    this._syncAutoFocus()
    if (!this.variant) this.setAttribute(ATTRIBUTES.VARIANT, 'default')
    if (!this.size) this.setAttribute(ATTRIBUTES.SIZE, 'default')
    this.setAttribute('role', 'checkbox')
    this._defaultChecked = this.checked
  }

  private _setupListeners(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal

    this._fieldEl?.addEventListener(
      'click',
      () => {
        if (this.disabled) return
        this.toggleChecked()
        this._emitChange()
      },
      { signal }
    )

    this.addEventListener(
      'keydown',
      (e) => {
        if (this.disabled) return
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          this.checked = !this.checked
          this._emitChange()
        }
      },
      { signal }
    )

    // Forward focus/blur for a11y
    this.addEventListener(
      'blur',
      () => {
        this.invalid = !this._internals?.validity.valid
      },
      { signal }
    )

    this._labelSlot?.addEventListener('slotchange', () => this._syncWrapperVisibility())
    this._descriptionSlot?.addEventListener('slotchange', () => this._syncWrapperVisibility())
    this._errorSlot?.addEventListener('slotchange', () => this._syncWrapperVisibility())
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
      if (this._errorSlot) {
        this._errorMessage = (
          this._errorSlot?.assignedNodes({ flatten: true })?.[0] as HTMLElement
        )?.textContent
      }
    }
  }

  private _emitChange(): void {
    const formValue = this.checked ? (this.getAttribute('value') ?? 'on') : null
    this._internals?.setFormValue(formValue)
    this.dispatchEvent(
      new CustomEvent<UIInputValueDetail>('change', {
        bubbles: true,
        composed: true,
        detail: { checked: this.checked }
      })
    )
  }

  private _wireA11y(): void {
    const idBase = `${UI_CHECKBOX_NAME}-${UICheckbox._idCounter++}`

    if (!this.id) {
      this.id = `${idBase}-checkbox`
    }

    if (this._labelEl) {
      if (!this._labelEl.id) {
        this._labelEl.id = `${idBase}-label`
      }
      this.setAttribute('aria-labelledby', this._labelEl.id)
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
      this.setAttribute('aria-describedby', describedByIds.join(' '))
    }
  }

  //---------------------------Sync States-------------------------
  private _syncChecked(): void {
    this.setAttribute('aria-checked', String(this.checked))
    const formValue = this.checked ? (this.getAttribute('value') ?? 'on') : null
    this._internals?.setFormValue(formValue)
  }

  private _syncDisabled(): void {
    this.setAttribute('aria-disabled', String(this.disabled))
    this.setAttribute('tabindex', this.disabled ? '-1' : '0')
  }

  private _syncInvalid(): void {
    if (this.invalid) {
      this.setAttribute('aria-invalid', 'true')
      this._internals?.setValidity({ customError: true }, this._errorMessage)
    } else {
      this.removeAttribute('aria-invalid')
      this._internals?.setValidity({})
    }
  }

  private _syncAutoFocus(): void {
    if (this.hasAttribute(ATTRIBUTES.AUTO_FOCUS)) {
      requestAnimationFrame(() => this.focus())
    }
  }

  //----------------------------Public API-------------------------
  focus(options?: FocusOptions): void {
    super.focus(options)
  }

  blur(): void {
    super.blur()
  }

  get checked(): boolean {
    return this.hasAttribute(ATTRIBUTES.CHECKED)
  }

  set checked(val: boolean) {
    this.toggleAttribute(ATTRIBUTES.CHECKED, !!val)
  }

  toggleChecked(): void {
    this.checked = !this.checked
  }

  get disabled(): boolean {
    return this.hasAttribute(ATTRIBUTES.DISABLED)
  }

  set disabled(val: boolean) {
    this.toggleAttribute(ATTRIBUTES.DISABLED, !!val)
  }

  // Form-associated custom element hooks
  formResetCallback(): void {
    this.checked = this._defaultChecked
    this._syncChecked()
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled
  }

  get variant(): UICheckboxVariants {
    return this.getAttribute(ATTRIBUTES.VARIANT) as UICheckboxVariants
  }

  set variant(val: UICheckboxVariants) {
    this.setAttribute(ATTRIBUTES.VARIANT, val ?? 'default')
  }

  get size(): UICheckboxSizes {
    return this.getAttribute(ATTRIBUTES.SIZE) as UICheckboxSizes
  }

  set size(val: UICheckboxSizes) {
    this.setAttribute(ATTRIBUTES.SIZE, val ?? 'default')
  }

  get invalid(): boolean {
    return this.hasAttribute(ATTRIBUTES.INVALID)
  }
  set invalid(v: boolean) {
    if (v) this.setAttribute(ATTRIBUTES.INVALID, '')
    else this.removeAttribute(ATTRIBUTES.INVALID)
  }
}

if (!customElements.get(UI_CHECKBOX_NAME)) {
  customElements.define(UI_CHECKBOX_NAME, UICheckbox)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_CHECKBOX_NAME]: UICheckbox
  }
}
