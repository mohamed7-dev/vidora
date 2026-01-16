import { UI_TOOLTIP_CONTENT_TAG_NAME } from './constants'

export class UiTooltipContent extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .tooltip__content {
          max-width: var(--ui-tooltip-max-width, 15rem);
          border-radius: var(--ui-tooltip-radius, var(--radius-md));
          background: var(--ui-tooltip-background, var(--popover));
          color: var(--ui-tooltip-foreground, var(--popover-foreground));
          padding: var(--ui-tooltip-padding, 0.35rem 0.55rem);
          font-size: var(--ui-tooltip-font-size, var(--font-size-small));
          line-height: var(--ui-tooltip-line-height, var(--line-height-dense));
          border: var(--ui-tooltip-border, 1px solid var(--border));
          box-shadow: var(--shadow-x-large);
        }
      </style>
      <div class="tooltip__content" part="base" role="tooltip">
        <slot></slot>
      </div>
    `
  }
}

if (!customElements.get(UI_TOOLTIP_CONTENT_TAG_NAME)) {
  customElements.define(UI_TOOLTIP_CONTENT_TAG_NAME, UiTooltipContent)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_TOOLTIP_CONTENT_TAG_NAME]: UiTooltipContent
  }
}
