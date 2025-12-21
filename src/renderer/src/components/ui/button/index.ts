import { createStyleSheetFromStyle } from '../lib/template-loader'
import style from './style.css?inline'
import template from './template.html?raw'

const BUTTON_NAME = 'ui-button'
const ATTRIBUTES = {
  VARIANT: 'variant',
  SIZE: 'size',
  DISABLED: 'disabled',
  LOADING: 'loading',
  TOGGLE: 'toggle',
  PRESSED: 'pressed',
  TYPE: 'type',
  NAME: 'name',
  VALUE: 'value'
}

export type UIButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
export type UIButtonSize = 'sm' | 'default' | 'lg' | 'icon'

export class UIButton extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  // refs
  private _buttonEl!: HTMLButtonElement
  private _prefixSlot: HTMLSlotElement | null = null
  private _prefixEl: HTMLElement | null = null
  private _suffixSlot: HTMLSlotElement | null = null
  private _suffixEl: HTMLElement | null = null
  private _labelSlot: HTMLSlotElement | null = null
  private _labelEl: HTMLElement | null = null
  private _spinnerSlot: HTMLSlotElement | null = null
  private _spinnerEl: HTMLElement | null = null

  // states
  private _initialized = false
  private _eventsAborter: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open', delegatesFocus: true })
  }

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
  }

  attributeChangedCallback(): void {
    if (!this._initialized) return
    this._syncButtonState()
  }

  connectedCallback(): void {
    if (!this._initialized) {
      this._render()
      this._queryRefs()
      this._setupListeners()
      this._syncButtonState()
      this._bindEventForwarders()
      this._bindKeyboardA11y()
      this._initialized = true
    } else {
      // In case attributes changed while disconnected
      this._syncButtonState()
    }
  }

  disconnectedCallback(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = null
    this._prefixSlot?.removeEventListener('slotchange', () => this._onPrefixSlotChange())
    this._labelSlot?.removeEventListener('slotchange', () => this._onLabelSlotChange())
    this._suffixSlot?.removeEventListener('slotchange', () => this._onSuffixSlotChange())
    this._spinnerSlot?.removeEventListener('slotchange', () => this._onSpinnerSlotChange())
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.innerHTML = template
    this.shadowRoot.adoptedStyleSheets = [UIButton.sheet]
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._buttonEl = this.shadowRoot.querySelector('button') as HTMLButtonElement
    this._prefixSlot = this.shadowRoot.querySelector("slot[name='prefix']")
    this._prefixEl = this.shadowRoot.querySelector("[data-el='prefix']")
    this._suffixSlot = this.shadowRoot.querySelector("slot[name='suffix']")
    this._suffixEl = this.shadowRoot.querySelector("[data-el='suffix']")
    this._spinnerSlot = this.shadowRoot.querySelector("slot[name='spinner']")
    this._spinnerEl = this.shadowRoot.querySelector("[data-el='spinner']")
    this._labelSlot = this.shadowRoot.querySelector('slot[name="label"]')
    this._labelEl = this.shadowRoot.querySelector('[data-el="label"]')
  }

  private _setupListeners(): void {
    this._prefixSlot?.addEventListener('slotchange', () => this._onPrefixSlotChange())
    this._labelSlot?.addEventListener('slotchange', () => this._onLabelSlotChange())
    this._suffixSlot?.addEventListener('slotchange', () => this._onSuffixSlotChange())
    this._spinnerSlot?.addEventListener('slotchange', () => this._onSpinnerSlotChange())
  }

  private _onLabelSlotChange(): void {
    const hasLabel = (this._labelSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    if (hasLabel) {
      this._labelEl?.setAttribute('data-has-label', '')
    } else {
      this._labelEl?.removeAttribute('data-has-label')
    }
  }

  private _onPrefixSlotChange(): void {
    const hasPrefix = (this._prefixSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    if (hasPrefix) {
      this._prefixEl?.setAttribute('data-has-prefix', '')
    } else {
      this._prefixEl?.removeAttribute('data-has-prefix')
    }
  }

  private _onSuffixSlotChange(): void {
    const hasSuffix = (this._suffixSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    if (hasSuffix) {
      this._suffixEl?.setAttribute('data-has-suffix', '')
    } else {
      this._suffixEl?.removeAttribute('data-has-suffix')
    }
  }

  private _onSpinnerSlotChange(): void {
    const hasSpinner = (this._spinnerSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    if (hasSpinner) {
      this._spinnerEl?.setAttribute('data-has-spinner', '')
    } else {
      this._spinnerEl?.removeAttribute('data-has-spinner')
    }
  }

  private _syncButtonState(): void {
    this._buttonEl.disabled = this.disabled || this.loading

    this._buttonEl.type = this.type ?? 'button'

    this.variant = this.variant ?? 'default'

    this.size = this.size ?? 'default'

    this._buttonEl.ariaBusy = this.loading ? 'true' : 'false'

    // Toggle button ARIA state
    if (this.toggle) {
      this._buttonEl.setAttribute('aria-pressed', this.pressed ? 'true' : 'false')
    } else {
      this._buttonEl.removeAttribute('aria-pressed')
    }
  }

  private _bindEventForwarders(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal

    // Forward focus/blur using original event for consistency
    const forward = (e: Event): void => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clone = new (e.constructor as any)(e.type, {
        ...e,
        bubbles: true,
        composed: true
      })
      this.dispatchEvent(clone)
    }
    this._buttonEl.addEventListener('focus', forward, { signal })
    this._buttonEl.addEventListener('blur', forward, { signal })

    // invalid
    this._buttonEl.addEventListener(
      'invalid',
      () => this.dispatchEvent(new Event('invalid', { bubbles: true, composed: true })),
      { signal }
    )

    // Toggle behavior
    this._buttonEl.addEventListener(
      'click',
      (event) => {
        if (this.hasAttribute('disabled') || this.hasAttribute('loading')) {
          event.preventDefault()
          event.stopImmediatePropagation()
          return
        }
        // Toggle behavior: when [toggle] is present, flip pressed state on click
        if (this.toggle) {
          this.pressed = !this.pressed
          this.dispatchEvent(
            new CustomEvent('ui-toggle', {
              detail: { pressed: this.pressed },
              bubbles: true,
              composed: true
            })
          )
        }
      },
      { signal }
    )
  }

  private _bindKeyboardA11y(): void {
    this.addEventListener('keydown', (e) => {
      if (this.disabled) return

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        e.stopPropagation()
      }

      if (e.key === 'Enter') {
        this.click()
      }
    })

    this.addEventListener('keyup', (e) => {
      if (this.disabled) return

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        this.click()
      }
    })
  }

  //-------------------------------Public API--------------------------------

  focus(options?: FocusOptions): void {
    if (this._buttonEl) this._buttonEl.focus(options)
    else super.focus(options)
  }

  blur(): void {
    this._buttonEl?.blur()
  }

  click(): void {
    this._buttonEl?.click()
  }

  get variant(): UIButtonVariant {
    return this.getAttribute(ATTRIBUTES.VARIANT) as UIButtonVariant
  }

  set variant(value: UIButtonVariant) {
    if (value) this.setAttribute(ATTRIBUTES.VARIANT, value)
    else this.setAttribute(ATTRIBUTES.VARIANT, 'default')
  }

  get size(): UIButtonSize {
    return this.getAttribute(ATTRIBUTES.SIZE) as UIButtonSize
  }

  set size(value: UIButtonSize) {
    if (value) this.setAttribute(ATTRIBUTES.SIZE, value)
    else this.setAttribute(ATTRIBUTES.SIZE, 'default')
  }

  get disabled(): boolean {
    return this.hasAttribute(ATTRIBUTES.DISABLED)
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute(ATTRIBUTES.DISABLED, '')
    } else {
      this.removeAttribute(ATTRIBUTES.DISABLED)
    }
  }

  get type(): HTMLButtonElement['type'] {
    return (this.getAttribute(ATTRIBUTES.TYPE) as HTMLButtonElement['type']) ?? 'button'
  }

  set type(value: HTMLButtonElement['type']) {
    if (value === 'submit' || value === 'reset' || value === 'button')
      this.setAttribute(ATTRIBUTES.TYPE, value)
    else this.removeAttribute(ATTRIBUTES.TYPE)
  }

  get name(): string | null {
    return this.getAttribute(ATTRIBUTES.NAME)
  }

  set name(value: string | null) {
    if (value === null) this.removeAttribute(ATTRIBUTES.NAME)
    else this.setAttribute(ATTRIBUTES.NAME, value)
  }

  get value(): string | null {
    return this.getAttribute(ATTRIBUTES.VALUE)
  }

  set value(value: string | null) {
    if (value === null) this.removeAttribute(ATTRIBUTES.VALUE)
    else this.setAttribute(ATTRIBUTES.VALUE, value)
  }

  get loading(): boolean {
    return this.hasAttribute(ATTRIBUTES.LOADING)
  }

  set loading(value: boolean) {
    if (value) this.setAttribute(ATTRIBUTES.LOADING, '')
    else this.removeAttribute(ATTRIBUTES.LOADING)
  }

  get toggle(): boolean {
    return this.hasAttribute(ATTRIBUTES.TOGGLE)
  }

  set toggle(value: boolean) {
    if (value) this.setAttribute(ATTRIBUTES.TOGGLE, '')
    else this.removeAttribute(ATTRIBUTES.TOGGLE)
  }

  get pressed(): boolean {
    return this.hasAttribute(ATTRIBUTES.PRESSED)
  }

  set pressed(value: boolean) {
    if (value) this.setAttribute(ATTRIBUTES.PRESSED, '')
    else this.removeAttribute(ATTRIBUTES.PRESSED)
  }
}

if (!customElements.get(BUTTON_NAME)) customElements.define(BUTTON_NAME, UIButton)

declare global {
  interface HTMLElementTagNameMap {
    [BUTTON_NAME]: UIButton
  }
}
