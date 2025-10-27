import template from './template.html?raw'
import styleCss from './style.css?inline'

export class UITooltip extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['side', 'align', 'offset']
  }

  private root: ShadowRoot | null = null
  private container: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.root = this.shadowRoot
    if (!this.root) return

    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('#ui-tooltip-template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = styleCss
    this.root.append(style, content)

    this.container = this.root.querySelector('.tooltip') as HTMLElement | null
    // Backward compatibility: if align holds a side value, migrate it
    this.normalizeAttributes()
    this.applySide()
    this.applyAlign()
    this.applyOffset()
  }

  attributeChangedCallback(name: string): void {
    if (name === 'side') this.applySide()
    if (name === 'align') this.applyAlign()
    if (name === 'offset') this.applyOffset()
  }

  private normalizeAttributes(): void {
    const align = (this.getAttribute('align') || '').toLowerCase()
    if (['top', 'bottom', 'left', 'right'].includes(align)) {
      // move side value from align -> side
      if (!this.hasAttribute('side')) this.setAttribute('side', align)
      // default align to center when using side-only
      if (!this.getAttribute('align')) this.setAttribute('align', 'center')
    }
    if (!this.getAttribute('side')) this.setAttribute('side', 'top')
    if (!this.getAttribute('align')) this.setAttribute('align', 'center')
  }

  private applySide(): void {
    const side = (this.getAttribute('side') || 'top').toLowerCase()
    if (this.container) this.container.setAttribute('data-side', side)
  }

  private applyAlign(): void {
    const align = (this.getAttribute('align') || 'center').toLowerCase()
    if (this.container) this.container.setAttribute('data-align', align)
  }

  private applyOffset(): void {
    const off = Number(this.getAttribute('offset') || '8')
    const px = isNaN(off) ? 8 : off
    this.style.setProperty('--ui-tooltip-offset', `${px}px`)
  }
}

customElements.define('ui-tooltip', UITooltip)
