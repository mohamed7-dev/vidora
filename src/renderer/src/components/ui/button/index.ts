import template from './template.html?raw'
import style from './style.css?inline'

export class UIButton extends HTMLElement {
  private _buttonEl: HTMLButtonElement | null = null
  private _attrObserver: MutationObserver | null = null
  private _eventsAborter: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return ['variant', 'size', 'disabled']
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'disabled' && this._buttonEl) {
      this._buttonEl.disabled = newValue !== null
    }
  }

  connectedCallback(): void {
    this.render()
    this._syncAllAttributesToInner()
    this._observeAttributeChanges()
    this._bindEventForwarders()
  }

  private render(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const templateElement = tree.querySelector<HTMLTemplateElement>('template')
    if (!templateElement) return
    const content = templateElement.content.cloneNode(true)
    const styleElement = document.createElement('style')
    styleElement.textContent = style
    this.shadowRoot?.append(styleElement, content)

    this._buttonEl = this.shadowRoot?.querySelector('button') ?? null

    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'default')
    if (!this.hasAttribute('size')) this.setAttribute('size', 'default')

    if (this.hasAttribute('disabled') && this._buttonEl) {
      this._buttonEl.disabled = true
    }
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

  private _syncAllAttributesToInner(): void {
    if (!this._buttonEl) return
    const deny = new Set(['id', 'class', 'style', 'slot', 'variant', 'size'])

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
}

customElements.define('ui-button', UIButton)
