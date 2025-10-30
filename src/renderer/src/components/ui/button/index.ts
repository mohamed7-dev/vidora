import template from './template.html?raw'
import style from './style.css?inline'

export class UIButton extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(style)
    return s
  })()
  private static readonly tpl: HTMLTemplateElement = (() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    const inner = doc.querySelector('template')
    const t = document.createElement('template')
    t.innerHTML = inner ? inner.innerHTML : template
    return t
  })()
  // refs
  private _buttonEl: HTMLButtonElement | null = null
  private _attrObserver: MutationObserver | null = null
  private _eventsAborter: AbortController | null = null

  constructor() {
    super()
    // focusing host would send focus to inner button
    this.attachShadow({ mode: 'open', delegatesFocus: true })
  }

  static get observedAttributes(): string[] {
    return ['variant', 'size', 'disabled', 'loading', 'toggle', 'pressed']
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'disabled' && this._buttonEl) {
      this._buttonEl.disabled = newValue !== null
    }
    if (name === 'loading' && this._buttonEl) {
      const isLoading = newValue !== null
      this._buttonEl.setAttribute('aria-busy', isLoading ? 'true' : 'false')
      if (isLoading) this._buttonEl.disabled = true
      else this._buttonEl.disabled = this.hasAttribute('disabled')
    }
    if (name === 'pressed' && this._buttonEl) {
      const isToggle = this.hasAttribute('toggle')
      if (isToggle) {
        const isPressed = newValue !== null
        this._buttonEl.setAttribute('aria-pressed', isPressed ? 'true' : 'false')
      }
    }
  }

  connectedCallback(): void {
    this._render()
    this._setDefaults()
    this._syncAllAttributesToInner()
    this._observeAttributeChanges()
    this._bindEventForwarders()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [UIButton.sheet]
    // append cached template content
    this.shadowRoot.append(UIButton.tpl.content.cloneNode(true))
    // query refs
    this._buttonEl = this.shadowRoot.querySelector('button') ?? null
  }

  disconnectedCallback(): void {
    this._attrObserver?.disconnect()
    this._attrObserver = null
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  private _observeAttributeChanges(): void {
    if (this._attrObserver) return
    this._attrObserver = new MutationObserver(() => this._syncAllAttributesToInner())
    this._attrObserver.observe(this, { attributes: true })
  }

  private _setDefaults(): void {
    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'default')
    if (!this.hasAttribute('size')) this.setAttribute('size', 'default')
    if (this.hasAttribute('disabled') && this._buttonEl) {
      this._buttonEl.disabled = true
    }
    if (this._buttonEl && !this.hasAttribute('type')) {
      this._buttonEl.type = 'button'
    }
  }

  private _syncAllAttributesToInner(): void {
    if (!this._buttonEl) return
    const deny = new Set([
      'id',
      'class',
      'style',
      'slot',
      'variant',
      'size',
      'loading',
      'toggle',
      'pressed'
    ])

    // Remove attributes on inner button that are not present on host anymore (except denylist)
    for (const attr of Array.from(this._buttonEl.attributes)) {
      if (deny.has(attr.name)) continue
      if (!this.hasAttribute(attr.name)) this._buttonEl.removeAttribute(attr.name)
    }

    // Mirror all host attributes (except denylist)
    for (const attr of Array.from(this.attributes)) {
      const name = attr.name
      if (deny.has(name)) continue
      const value = attr.value
      // Handle boolean attributes: if present with empty value, set empty string
      if (value === '' || value === name) this._buttonEl.setAttribute(name, '')
      else this._buttonEl.setAttribute(name, value)
    }

    // Keep disabled property in sync with attribute
    this._buttonEl.disabled = this.hasAttribute('disabled')
    if (!this.hasAttribute('type')) this._buttonEl.setAttribute('type', 'button')

    const isLoading = this.hasAttribute('loading')
    this._buttonEl.setAttribute('aria-busy', isLoading ? 'true' : 'false')
    if (isLoading) this._buttonEl.disabled = true

    const isToggle = this.hasAttribute('toggle')
    if (isToggle) {
      const isPressed = this.hasAttribute('pressed')
      this._buttonEl.setAttribute('aria-pressed', isPressed ? 'true' : 'false')
    } else {
      this._buttonEl.removeAttribute('aria-pressed')
    }
  }

  private _bindEventForwarders(): void {
    if (!this._buttonEl) return
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal

    // Forward focus/blur (non-bubbling in shadow DOM)
    this._buttonEl.addEventListener(
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
    this._buttonEl.addEventListener(
      'blur',
      (e: FocusEvent) => {
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

    // Forward invalid (does not bubble by default)
    this._buttonEl.addEventListener(
      'invalid',
      () => {
        this.dispatchEvent(new Event('invalid', { bubbles: true, composed: true }))
      },
      { signal }
    )

    this._buttonEl.addEventListener(
      'click',
      () => {
        if (!this.hasAttribute('toggle')) return
        if (this.hasAttribute('disabled') || this.hasAttribute('loading')) return
        if (this.hasAttribute('pressed')) this.removeAttribute('pressed')
        else this.setAttribute('pressed', '')
      },
      { signal }
    )
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
    if (value) this.setAttribute('disabled', '')
    else this.removeAttribute('disabled')
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
