import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?raw'
import style from './style.css?inline'

export class UICheckbox extends HTMLElement {
  private _inputEl: HTMLInputElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const templateElement = tree.querySelector<HTMLTemplateElement>('template')
    if (!templateElement) return

    const content = templateElement.content.cloneNode(true)
    const styleElement = document.createElement('style')
    styleElement.textContent = resetStyle + style
    this.shadowRoot?.append(styleElement, content)

    this._inputEl = this.shadowRoot?.querySelector('input.native') ?? null

    // Defaults
    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'default')
    if (!this.hasAttribute('size')) this.setAttribute('size', 'default')

    // Reflect initial attributes to native input
    this.syncToInput()

    // Events
    this._inputEl?.addEventListener('change', () => {
      const checked = !!this._inputEl?.checked
      this.toggleAttribute('checked', checked)
      this.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Rely on native label/input behavior for toggling
  }

  static get observedAttributes(): string[] {
    return ['checked', 'disabled', 'variant', 'size']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'checked' || name === 'disabled') this.syncToInput()
  }

  private syncToInput(): void {
    if (!this._inputEl) return
    this._inputEl.checked = this.hasAttribute('checked')
    this._inputEl.disabled = this.hasAttribute('disabled')
    this.setAttribute('aria-checked', String(this._inputEl.checked))
    this.setAttribute('role', 'checkbox')
  }

  get checked(): boolean {
    return this.hasAttribute('checked')
  }

  set checked(val: boolean) {
    this.toggleAttribute('checked', !!val)
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(val: boolean) {
    this.toggleAttribute('disabled', !!val)
  }
}

customElements.define('ui-checkbox', UICheckbox)
