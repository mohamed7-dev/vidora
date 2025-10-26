import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?raw'
import style from './style.css?inline'

const VALUE_ATTR = 'value'
const PLACEHOLDER_ATTR = 'placeholder'
const TYPE_ATTR = 'type'
const DISABLED_ATTR = 'disabled'
const INVALID_ATTR = 'invalid'

export type UIInputValueDetail = { value: string }

export class UIInput extends HTMLElement {
  private _inputEl: HTMLInputElement | null = null
  private _attrObserver: MutationObserver | null = null
  private _eventsAborter: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
  static get observedAttributes(): string[] {
    return [VALUE_ATTR, PLACEHOLDER_ATTR, TYPE_ATTR, DISABLED_ATTR, INVALID_ATTR]
  }

  attributeChangedCallback(name: string): void {
    if (!this._inputEl) return
    if (name === VALUE_ATTR) this._inputEl.value = this.getAttribute(VALUE_ATTR) ?? ''
    else if (name === PLACEHOLDER_ATTR)
      this._inputEl.placeholder = this.getAttribute(PLACEHOLDER_ATTR) ?? ''
    else if (name === TYPE_ATTR) this._inputEl.type = this.getAttribute(TYPE_ATTR) ?? 'text'
    else if (name === DISABLED_ATTR) this._inputEl.disabled = this.hasAttribute(DISABLED_ATTR)
    else if (name === INVALID_ATTR) {
      const invalid = this.hasAttribute(INVALID_ATTR)
      if (invalid) this._inputEl.setAttribute('aria-invalid', 'true')
      else this._inputEl.removeAttribute('aria-invalid')
    }
  }
  connectedCallback(): void {
    this.render()

    this._syncAll()
    this._bindEvents()
    this._syncAllAttributesToInner()
    this._observeAttributeChanges()

    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'default')
    if (!this.hasAttribute('size')) this.setAttribute('size', 'md')
  }

  disconnectedCallback(): void {
    this._attrObserver?.disconnect()
    this._attrObserver = null
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  private render(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)

    const styleEl = document.createElement('style')
    styleEl.textContent = resetStyle + style
    this.shadowRoot?.append(styleEl, content)

    this._inputEl = this.shadowRoot?.querySelector('input') as HTMLInputElement | null
  }

  private _bindEvents(): void {
    if (!this._inputEl) return
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal

    this._inputEl.addEventListener(
      'input',
      () => {
        this.setAttribute(VALUE_ATTR, this._inputEl?.value ?? '')
        this.dispatchEvent(
          new CustomEvent<UIInputValueDetail>('input', {
            bubbles: true,
            composed: true,
            detail: { value: this.value }
          })
        )
        this.dispatchEvent(
          new CustomEvent<UIInputValueDetail>('ui-input', {
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
        this.setAttribute(VALUE_ATTR, this._inputEl?.value ?? '')
        this.dispatchEvent(
          new CustomEvent<UIInputValueDetail>('change', {
            bubbles: true,
            composed: true,
            detail: { value: this.value }
          })
        )
        this.dispatchEvent(
          new CustomEvent<UIInputValueDetail>('ui-change', {
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

  private _syncAll(): void {
    if (!this._inputEl) return
    this._inputEl.value = this.getAttribute(VALUE_ATTR) ?? ''
    this._inputEl.placeholder = this.getAttribute(PLACEHOLDER_ATTR) ?? ''
    this._inputEl.type = this.getAttribute(TYPE_ATTR) ?? 'text'
    this._inputEl.disabled = this.hasAttribute(DISABLED_ATTR)
    if (this.hasAttribute(INVALID_ATTR)) this._inputEl.setAttribute('aria-invalid', 'true')
    else this._inputEl.removeAttribute('aria-invalid')
  }

  // Mirror all host attributes (except a small denylist) to internal input
  private _observeAttributeChanges(): void {
    if (this._attrObserver) return
    this._attrObserver = new MutationObserver(() => this._syncAllAttributesToInner())
    this._attrObserver.observe(this, { attributes: true })
  }

  private _syncAllAttributesToInner(): void {
    if (!this._inputEl) return
    const deny = new Set(['id', 'class', 'style', 'slot', INVALID_ATTR, 'variant', 'size', 'block'])

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

  // API
  get value(): string {
    return this.getAttribute(VALUE_ATTR) ?? ''
  }

  set value(v: string) {
    this.setAttribute(VALUE_ATTR, v)
    if (this._inputEl) this._inputEl.value = v
  }

  get placeholder(): string | null {
    return this.getAttribute(PLACEHOLDER_ATTR)
  }

  set placeholder(v: string | null) {
    if (v === null) this.removeAttribute(PLACEHOLDER_ATTR)
    else this.setAttribute(PLACEHOLDER_ATTR, v)
    if (this._inputEl) this._inputEl.placeholder = v ?? ''
  }

  get type(): string {
    return this.getAttribute(TYPE_ATTR) ?? 'text'
  }

  set type(v: string) {
    this.setAttribute(TYPE_ATTR, v)
    if (this._inputEl) this._inputEl.type = v
  }

  get disabled(): boolean {
    return this.hasAttribute(DISABLED_ATTR)
  }

  set disabled(v: boolean) {
    if (v) this.setAttribute(DISABLED_ATTR, '')
    else this.removeAttribute(DISABLED_ATTR)
    if (this._inputEl) this._inputEl.disabled = v
  }

  // Proxies for convenience
  focus(options?: FocusOptions): void {
    this._inputEl?.focus(options)
  }

  blur(): void {
    this._inputEl?.blur()
  }

  select(): void {
    this._inputEl?.select()
  }
}

customElements.define('ui-input', UIInput)

declare global {
  interface HTMLElementTagNameMap {
    'ui-input': UIInput
  }
}
