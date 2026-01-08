import { UI_ALERT_CONTENT_ATTRIBUTES, UI_ALERT_CONTENT_TAG_NAME } from './constants'
import { ensureAlert, type UIAlert } from './ui-alert'

export class UiAlertContent extends HTMLElement {
  private _alert: UIAlert | null = null
  private _variantChangeCleanup: (() => void) | undefined = undefined

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._alert = ensureAlert(this, UI_ALERT_CONTENT_TAG_NAME) as UIAlert | null
    this._setupListeners()
    this._init()
    this._render()
  }

  disconnectedCallback(): void {
    this._variantChangeCleanup?.()
    this._variantChangeCleanup = undefined
  }

  private _setupListeners(): void {
    this._variantChangeCleanup = this._alert?.onVariantChange(() => {
      this._syncVariant()
    })
  }

  private _syncVariant(): void {
    if (!this._alert) return
    const variant = this._alert.variant
    this.setAttribute(UI_ALERT_CONTENT_ATTRIBUTES.VARIANT, variant)
  }

  private _init(): void {
    this.id = this._alert?.contentId || ''
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
    <style>
        :host {
            display: block;
            box-sizing: border-box;
        }
        .alert__content{
            padding: var(--ui-alert-content-padding);
            font-size: var(--ui-alert-content-font-size, var(--font-size-small));
            line-height: var(--ui-alert-content-line-height, var(--line-height-dense));
        }
        :host([variant="default"]) .alert__content,
        .alert__content {
            color: var(--ui-alert-content-color-default, var(--primary));
        }
        :host([variant="destructive"]) .alert__content {
            color: var(--ui-alert-content-color-destructive, var(--destructive));
        }
    </style>
    <div part="base" class="alert__content">
        <slot></slot>
    </div>
    `
  }
}

if (!customElements.get(UI_ALERT_CONTENT_TAG_NAME)) {
  customElements.define(UI_ALERT_CONTENT_TAG_NAME, UiAlertContent)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_ALERT_CONTENT_TAG_NAME]: UiAlertContent
  }
}
