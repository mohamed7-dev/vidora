import html from './empty-placeholder.template.html?raw'
import style from './empty-placeholder.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'

const EMPTY_DATA_ATTRS = {
  DATA_HIDE: 'data-hide',
  DATA_MESSAGE: 'data-message',
  DATA_ICON_NAME: 'data-icon-name'
}

const EMPTY_DATA_TAG_NAME = 'empty-data-placeholder'

export interface EmptyPlaceholderConfig {
  message: string
  iconName?: string
}

export class EmptyDataPlaceholder extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // refs
  private _messageEl: HTMLParagraphElement | null = null
  private _iconEl: HTMLElement | null = null

  static get observedAttributes(): string[] {
    return [
      EMPTY_DATA_ATTRS.DATA_HIDE,
      EMPTY_DATA_ATTRS.DATA_MESSAGE,
      EMPTY_DATA_ATTRS.DATA_ICON_NAME
    ]
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === EMPTY_DATA_ATTRS.DATA_HIDE) {
      this.toggleAttribute(EMPTY_DATA_ATTRS.DATA_HIDE, _newValue !== null)
    }

    if (name === EMPTY_DATA_ATTRS.DATA_MESSAGE) {
      this._applyMessage()
    }

    if (name === EMPTY_DATA_ATTRS.DATA_ICON_NAME) {
      this._applyIconName()
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
    this.shadowRoot.adoptedStyleSheets = [EmptyDataPlaceholder.sheet]
    this.shadowRoot.append(EmptyDataPlaceholder.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._messageEl = this.shadowRoot.querySelector('[data-el="message"]') as HTMLParagraphElement
    this._iconEl = this.shadowRoot.querySelector('[data-el="icon"]') as HTMLElement
  }

  private _init(): void {
    this._applyMessage()
    this._applyIconName()
  }

  private _applyMessage(): void {
    if (!this._messageEl) return
    this._messageEl.textContent = this.message || ''
  }

  private _applyIconName(): void {
    if (!this._iconEl) return
    if (this.iconName) {
      this._iconEl.setAttribute('name', this.iconName)
      this._iconEl.hidden = false
    } else {
      this._iconEl.removeAttribute('name')
      this._iconEl.hidden = true
    }
  }

  private _ensureReady(): void {
    this._render()
    this._queryRefs()
    this._init()
  }
  //------------------Public API------------------------
  create(config: EmptyPlaceholderConfig): EmptyDataPlaceholder | undefined {
    this._ensureReady()
    if (!this._messageEl || !this._iconEl) return
    this.message = config.message

    if (config.iconName) {
      this.iconName = config.iconName
    }

    return this
  }

  get iconName(): string | null {
    return this.getAttribute(EMPTY_DATA_ATTRS.DATA_ICON_NAME)
  }

  set iconName(value: string | null) {
    this.setAttribute(EMPTY_DATA_ATTRS.DATA_ICON_NAME, value ?? '')
  }

  get message(): string {
    return this.getAttribute(EMPTY_DATA_ATTRS.DATA_MESSAGE) || ''
  }

  set message(value: string) {
    this.setAttribute(EMPTY_DATA_ATTRS.DATA_MESSAGE, value)
  }
}

if (!customElements.get(EMPTY_DATA_TAG_NAME)) {
  customElements.define(EMPTY_DATA_TAG_NAME, EmptyDataPlaceholder)
}

declare global {
  interface HTMLElementTagNameMap {
    [EMPTY_DATA_TAG_NAME]: EmptyDataPlaceholder
  }
}
