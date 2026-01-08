import { UI_ALERT_TITLE_ATTRIBUTES, UI_ALERT_TITLE_TAG_NAME } from './constants'
import { ensureAlert, type UIAlert } from './ui-alert'

export class UIAlertTitle extends HTMLElement {
  private _alert: UIAlert | null = null
  private _variantChangeCleanup: (() => void) | undefined = undefined

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._alert = ensureAlert(this, UI_ALERT_TITLE_TAG_NAME) as UIAlert | null
    this._setupListeners()
    this._init()
    this._render()
  }

  disconnectedCallback(): void {
    this._variantChangeCleanup?.()
    this._variantChangeCleanup = undefined
  }

  private _init(): void {
    this.id = this._alert?.titleId || ''
  }

  private _syncVariant(): void {
    if (this._alert) {
      const variant = this._alert.variant
      this.setAttribute(UI_ALERT_TITLE_ATTRIBUTES.VARIANT, variant)
    }
  }

  private _setupListeners(): void {
    this._variantChangeCleanup = this._alert?.onVariantChange(() => {
      this._syncVariant()
    })
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                box-sizing: border-box;
                flex: 1;
                width: 100%;
            }
            .alert__title {
                display: flex;
                align-items: center;
                font-size: var(--ui-alert-title-font-size, var(--font-size-large));
                font-weight: var(--ui-alert-title-font-weight, var(--font-weight-semibold));
                margin: 0;
                box-sizing: border-box;
                width: 100%;
                text-wrap: balance;
                line-height: var(--line-height-dense);
            }
            :host([variant="default"]) .alert__title,
            .alert__title {
                color: var(--ui-alert-title-color-default, var(--primary));
            }
            :host([variant="destructive"]) .alert__title {
                color: var(--ui-alert-title-color-destructive, var(--destructive));
            }
        </style>
        <h2 part="base" class="alert__title">
            <slot></slot>
        </h2>
    `
  }
}

if (!customElements.get(UI_ALERT_TITLE_TAG_NAME)) {
  customElements.define(UI_ALERT_TITLE_TAG_NAME, UIAlertTitle)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_ALERT_TITLE_TAG_NAME]: UIAlertTitle
  }
}
