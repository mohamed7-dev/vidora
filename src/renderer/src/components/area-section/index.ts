import html from './template.html?raw'
import style from './style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'

const AREA_SECTION_TAG_NAME = 'area-section'

const ATTRIBUTES = {
  LABEL: 'label'
}

export class AreaSection extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  private _label: HTMLHeadElement | null = null

  static get observedAttributes(): string[] {
    return [ATTRIBUTES.LABEL]
  }

  attributeChangedCallback(name: string): void {
    if (name === ATTRIBUTES.LABEL) {
      this._syncLabel()
    }
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._init()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [AreaSection.sheet]
    this.shadowRoot.append(AreaSection.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    this._label = this.shadowRoot?.querySelector('[data-el="label"]') as HTMLHeadElement
  }

  private _syncLabel(): void {
    if (!this.shadowRoot) return
    if (this._label) {
      this._label.textContent = this.label
    }
    this.toggleAttribute('data-has-label', !!this.label)
  }

  private _init(): void {
    this._syncLabel()
  }

  get label(): string {
    return this.getAttribute(ATTRIBUTES.LABEL) ?? ''
  }

  set label(value: string) {
    this.setAttribute(ATTRIBUTES.LABEL, value)
  }
}

if (!customElements.get(AREA_SECTION_TAG_NAME)) {
  customElements.define(AREA_SECTION_TAG_NAME, AreaSection)
}

declare global {
  interface HTMLElementTagNameMap {
    [AREA_SECTION_TAG_NAME]: AreaSection
  }
}
