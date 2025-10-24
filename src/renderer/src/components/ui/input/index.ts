import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?raw'
import style from './style.css?inline'

const VALUE_ATTR = 'value'
const PLACEHOLDER_ATTR = 'placeholder'
const TYPE_ATTR = 'type'
const DISABLED_ATTR = 'disabled'

export class UIInput extends HTMLElement {
  private _inputEl: HTMLInputElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)

    const styleEl = document.createElement('style')
    styleEl.textContent = resetStyle + style
    this.shadowRoot?.append(styleEl, content)

    this._inputEl = this.shadowRoot?.querySelector('input') as HTMLInputElement | null

    this._syncAll()
    this._bindEvents()
  }

  disconnectedCallback(): void {
    // nothing to cleanup for now
  }

  static get observedAttributes(): string[] {
    return [VALUE_ATTR, PLACEHOLDER_ATTR, TYPE_ATTR, DISABLED_ATTR]
  }

  attributeChangedCallback(name: string): void {
    if (!this._inputEl) return
    if (name === VALUE_ATTR) this._inputEl.value = this.getAttribute(VALUE_ATTR) ?? ''
    else if (name === PLACEHOLDER_ATTR)
      this._inputEl.placeholder = this.getAttribute(PLACEHOLDER_ATTR) ?? ''
    else if (name === TYPE_ATTR) this._inputEl.type = this.getAttribute(TYPE_ATTR) ?? 'text'
    else if (name === DISABLED_ATTR) this._inputEl.disabled = this.hasAttribute(DISABLED_ATTR)
  }

  private _bindEvents(): void {
    if (!this._inputEl) return
    this._inputEl.addEventListener('input', () => {
      this.setAttribute(VALUE_ATTR, this._inputEl?.value ?? '')
      this.dispatchEvent(new CustomEvent('input', { detail: { value: this.value } }))
    })
    this._inputEl.addEventListener('change', () => {
      this.setAttribute(VALUE_ATTR, this._inputEl?.value ?? '')
      this.dispatchEvent(new CustomEvent('change', { detail: { value: this.value } }))
    })
  }

  private _syncAll(): void {
    if (!this._inputEl) return
    this._inputEl.value = this.getAttribute(VALUE_ATTR) ?? ''
    this._inputEl.placeholder = this.getAttribute(PLACEHOLDER_ATTR) ?? ''
    this._inputEl.type = this.getAttribute(TYPE_ATTR) ?? 'text'
    this._inputEl.disabled = this.hasAttribute(DISABLED_ATTR)
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
}

customElements.define('ui-input', UIInput)

declare global {
  interface HTMLElementTagNameMap {
    'ui-input': UIInput
  }
}
