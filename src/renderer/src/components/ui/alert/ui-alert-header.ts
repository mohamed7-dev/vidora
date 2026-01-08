import { UI_ALERT_HEADER_TAG_NAME } from './constants'

export class UIAlertHeader extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
  connectedCallback(): void {
    this.render()
  }

  private render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
            }
            .alert__header {
                display: flex;
                align-items: center;
                padding: var(--ui-alert-header-padding);
                gap: var(--ui-alert-header-gap, var(--spacing-x-small));
            }
        </style>
        <header part="base" class="alert__header">
            <slot></slot>
        </header>
    `
  }
}

if (!customElements.get(UI_ALERT_HEADER_TAG_NAME)) {
  customElements.define(UI_ALERT_HEADER_TAG_NAME, UIAlertHeader)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_ALERT_HEADER_TAG_NAME]: UIAlertHeader
  }
}
