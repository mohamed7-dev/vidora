import template from './template.html?raw'
import style from './style.css?inline'

export class UIButton extends HTMLElement {
  private _buttonEl: HTMLButtonElement | null = null

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
    styleElement.textContent = style
    this.shadowRoot?.append(styleElement, content)

    this._buttonEl = this.shadowRoot?.querySelector('button') ?? null

    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'default')
    if (!this.hasAttribute('size')) this.setAttribute('size', 'default')

    if (this.hasAttribute('disabled') && this._buttonEl) {
      this._buttonEl.disabled = true
    }
  }

  static get observedAttributes(): string[] {
    return ['variant', 'size', 'disabled']
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'disabled' && this._buttonEl) {
      this._buttonEl.disabled = newValue !== null
    }
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
