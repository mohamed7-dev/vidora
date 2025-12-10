import style from './style.css?inline'
import template from './template.html?raw'

export type UIButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
export type UIButtonSize = 'sm' | 'default' | 'lg' | 'icon'

export class UIButton extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(style)
    return s
  })()
  // refs
  private _buttonEl!: HTMLButtonElement
  private _eventsAborter: AbortController | null = null

  // states
  private _initialized = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open', delegatesFocus: true })
  }

  static get observedAttributes(): string[] {
    return ['variant', 'size', 'disabled', 'loading', 'toggle', 'pressed', 'type']
  }

  attributeChangedCallback(): void {
    if (!this._initialized) return
    this._syncButtonState()
  }

  connectedCallback(): void {
    if (!this._initialized) {
      this._render()
      this._queryRefs()
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
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.innerHTML = template

    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [UIButton.sheet]
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._buttonEl = this.shadowRoot.querySelector('button') as HTMLButtonElement
  }

  private _syncButtonState(): void {
    const disabled = this.hasAttribute('disabled')
    const loading = this.hasAttribute('loading')

    this._buttonEl.disabled = disabled || loading

    const type = (this.getAttribute('type') as HTMLButtonElement['type']) ?? 'button'
    this._buttonEl.type = type

    const variant = (this.variant as UIButtonVariant) ?? 'default'
    this.variant = variant

    const size = (this.variant as UIButtonSize) ?? 'default'
    this.size = size

    if (!this.variant) {
      this.variant = 'default'
    }

    this._buttonEl.ariaBusy = loading ? 'true' : 'false'

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
    // Add key handling on host, not on internal button
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

  // Public methods proxy to internal button for convenience
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

  get variant(): string | null {
    return this.getAttribute('variant')
  }

  set variant(value: string | null) {
    if (value === null) this.removeAttribute('variant')
    else this.setAttribute('variant', value)
  }

  get size(): string | null {
    return this.getAttribute('size')
  }

  set size(value: string | null) {
    if (value === null) this.removeAttribute('size')
    else this.setAttribute('size', value)
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '')
    } else {
      this.removeAttribute('disabled')
    }
  }

  get type(): string {
    return this.getAttribute('type') ?? 'button'
  }

  set type(value: string) {
    if (value === '') this.removeAttribute('type')
    else this.setAttribute('type', value)
  }

  get name(): string | null {
    return this.getAttribute('name')
  }

  set name(value: string | null) {
    if (value === null) this.removeAttribute('name')
    else this.setAttribute('name', value)
  }

  get value(): string | null {
    return this.getAttribute('value')
  }

  set value(value: string | null) {
    if (value === null) this.removeAttribute('value')
    else this.setAttribute('value', value)
  }

  get loading(): boolean {
    return this.hasAttribute('loading')
  }

  set loading(value: boolean) {
    if (value) this.setAttribute('loading', '')
    else this.removeAttribute('loading')
  }

  get toggle(): boolean {
    return this.hasAttribute('toggle')
  }

  set toggle(value: boolean) {
    if (value) this.setAttribute('toggle', '')
    else this.removeAttribute('toggle')
  }

  get pressed(): boolean {
    return this.hasAttribute('pressed')
  }

  set pressed(value: boolean) {
    if (value) this.setAttribute('pressed', '')
    else this.removeAttribute('pressed')
  }
}

if (!customElements.get('ui-button')) customElements.define('ui-button', UIButton)

declare global {
  interface HTMLElementTagNameMap {
    'ui-button': UIButton
  }
}
