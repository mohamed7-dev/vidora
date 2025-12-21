import template from './template.html?raw'
import style from './style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../lib/template-loader'

const UI_ALERT_NAME = 'ui-alert'
const ICONS = {
  destructive: 'triangle-alert',
  default: 'info'
}
const ATTRIBUTES = {
  VARIANT: 'variant',
  CLOSABLE: 'closable',
  HIDDEN: 'hidden'
}
const UI_ALERT_EVENTS = {
  CLOSE: 'ui-alert-close'
}

export type UIAlertVariant = 'default' | 'destructive'

export class UIAlert extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)

  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(template)

  private static _idCounter = 0

  // refs
  private closeBtn: HTMLButtonElement | null = null
  private rootEl: HTMLDivElement | null = null
  private iconEl: HTMLElement | null = null
  private titleEl: HTMLDivElement | null = null
  private descriptionEl: HTMLDivElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
  }

  attributeChangedCallback(name: string): void {
    if (name === ATTRIBUTES.VARIANT) {
      this._syncVariant()
    }
    if (name === ATTRIBUTES.CLOSABLE) {
      this._syncClosable()
    }
    if (name === ATTRIBUTES.HIDDEN) {
      this._syncHidden()
    }
  }

  connectedCallback(): void {
    this._render()
    this._cacheRefs()
    this._syncVariant()
    this._syncClosable()
    this._syncHidden()
    this._applyListeners()
  }

  disconnectedCallback(): void {
    if (!this.closeBtn) return
    this.closeBtn.removeEventListener('click', this._onCloseClick)
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UIAlert.sheet]
    const frag = UIAlert.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.append(frag)
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this.rootEl = this.shadowRoot.querySelector('[data-el="root"]') as HTMLDivElement | null
    this.iconEl = this.shadowRoot.querySelector('[data-el="icon"]') as HTMLElement | null
    this.titleEl = this.shadowRoot.querySelector('[data-el="title"]') as HTMLDivElement | null
    this.descriptionEl = this.shadowRoot.querySelector(
      '[data-el="description"]'
    ) as HTMLDivElement | null
    this.closeBtn = this.shadowRoot.querySelector(
      '[data-el="close-btn"]'
    ) as HTMLButtonElement | null

    // Ensure title/description have stable IDs and wire them for screen readers.
    if (this.titleEl && !this.titleEl.id) {
      this.titleEl.id = `${UI_ALERT_NAME}-title-${UIAlert._idCounter++}`
    }
    if (this.descriptionEl && !this.descriptionEl.id) {
      this.descriptionEl.id = `${UI_ALERT_NAME}-description-${UIAlert._idCounter++}`
    }

    if (this.titleEl?.id) {
      this.setAttribute('aria-labelledby', this.titleEl.id)
    }
    if (this.descriptionEl?.id) {
      this.setAttribute('aria-describedby', this.descriptionEl.id)
    }
  }

  private _syncVariant(): void {
    const variant = this.variant
    if (this.rootEl) {
      this.rootEl.setAttribute('data-variant', variant)
    }

    if (this.iconEl) {
      const iconName = variant === 'destructive' ? ICONS.destructive : ICONS.default
      this.iconEl.setAttribute('name', iconName)
    }

    variant === 'destructive'
      ? this.setAttribute('role', 'alert')
      : this.setAttribute('role', 'status')
    variant === 'destructive'
      ? this.setAttribute('aria-live', 'assertive')
      : this.setAttribute('aria-live', 'polite')
  }

  private _syncClosable(): void {
    if (this.closeBtn) {
      this.closeBtn.style.display = this.closable ? '' : 'none'
    }
  }

  private _syncHidden(): void {
    this.style.display = this.hidden ? 'none' : ''
  }

  private _applyListeners(): void {
    if (!this.closeBtn) return
    this.closeBtn.addEventListener('click', this._onCloseClick)
  }

  private _onCloseClick = (): void => {
    this.dispatchEvent(new CustomEvent(UI_ALERT_EVENTS.CLOSE, { bubbles: true, composed: true }))
    this.hide()
  }

  show(): void {
    this.hidden = false
    this._syncHidden()
  }

  hide(): void {
    this.hidden = true
    this._syncHidden()
  }

  //---------------------------------Public API-------------------------------
  get variant(): UIAlertVariant {
    return (this.getAttribute(ATTRIBUTES.VARIANT) as UIAlertVariant) || 'default'
  }

  set variant(variant: UIAlertVariant | null) {
    this.setAttribute(ATTRIBUTES.VARIANT, variant ?? 'default')
  }

  get closable(): boolean {
    return this.hasAttribute(ATTRIBUTES.CLOSABLE)
  }

  set closable(isClosable: boolean) {
    if (!isClosable) {
      this.removeAttribute(ATTRIBUTES.CLOSABLE)
    } else {
      this.setAttribute(ATTRIBUTES.CLOSABLE, '')
    }
  }

  get hidden(): boolean {
    return this.hasAttribute(ATTRIBUTES.HIDDEN)
  }

  set hidden(isHidden: boolean) {
    if (!isHidden) {
      this.removeAttribute(ATTRIBUTES.HIDDEN)
    } else {
      this.setAttribute(ATTRIBUTES.HIDDEN, '')
    }
  }
}

if (!customElements.get(UI_ALERT_NAME)) {
  customElements.define(UI_ALERT_NAME, UIAlert)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_ALERT_NAME]: UIAlert
  }

  interface HTMLElementEventMap {
    [UI_ALERT_EVENTS.CLOSE]: CustomEvent<void>
  }
}
