import { ICONS, UI_ALERT_ICON_ATTRIBUTES, UI_ALERT_ICON_TAG_NAME } from './constants'
import { ensureAlert, type UIAlert } from './ui-alert'

export class UIAlertIcon extends HTMLElement {
  private _alert: UIAlert | null = null
  private _iconName: string | null = null
  private _variantChangeCleanup: (() => void) | undefined = undefined

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return [UI_ALERT_ICON_ATTRIBUTES.NAME]
  }

  attributeChangedCallback(name: string): void {
    if (name === UI_ALERT_ICON_ATTRIBUTES.NAME) {
      this._syncIconName()
    }
  }

  connectedCallback(): void {
    if (!this.shadowRoot) return
    this._alert = ensureAlert(this, UI_ALERT_ICON_TAG_NAME) as UIAlert | null
    this._setupListeners()
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
    if (this._alert) {
      this._syncIconName()
      this.setAttribute(UI_ALERT_ICON_ATTRIBUTES.VARIANT, this._alert.variant || 'default')
    }
  }

  private _syncIconName(): void {
    if (this._alert) {
      const variant = this._alert.variant
      this._iconName = this.iconName || ICONS[variant] || ICONS.default
    }
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
        <style>
            .alert__icon {
                --ui-icon-size: var(--ui-alert-icon-size, 1.5rem);
                transition: color 0.2s ease;
            }
            :host([variant='default']) .alert__icon,
            .alert__icon {
                color: var(--ui-alert-icon-color-default, var(--primary));
            }
            :host([variant='destructive']) .alert__icon {
                color: var(--ui-alert-icon-color-destructive, var(--destructive));
            }
        </style>
        <ui-icon name="${this._iconName || 'info'}" class="alert__icon" part="base"></ui-icon>
    `
  }

  get iconName(): string | null {
    return this.getAttribute(UI_ALERT_ICON_ATTRIBUTES.NAME)
  }

  set iconName(value: string) {
    this.setAttribute(UI_ALERT_ICON_ATTRIBUTES.NAME, value)
  }
}

if (!customElements.get(UI_ALERT_ICON_TAG_NAME)) {
  customElements.define(UI_ALERT_ICON_TAG_NAME, UIAlertIcon)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_ALERT_ICON_TAG_NAME]: UIAlertIcon
  }
}
