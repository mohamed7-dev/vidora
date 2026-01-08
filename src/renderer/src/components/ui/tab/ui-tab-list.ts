import { UI_TAB_LIST_TAG_NAME } from './constants'

export class UiTabList extends HTMLElement {
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
        :host {
          box-sizing: border-box;
        }
        .tab__list {
          width: var(--ui-tab-list-width, 100%);
          display: flex;
          gap: var(--ui-tab-list-gap, var(--spacing-3x-small));
          padding: var(--ui-tab-list-padding, var(--spacing-2x-small));
          background: var(--ui-tab-list-background, var(--accent));
          color: var(--ui-tab-list-color, var(--accent-foreground));
          border: var(--ui-tab-list-border, 1px solid var(--border));
          border-radius: var(--ui-tab-list-border-radius, var(--radius-md));
          overflow-x: auto;
          box-sizing: border-box;
        }
      </style>
      <div part="base" class="tab__list" role="tablist">
        <slot></slot>
      </div>
    `
  }
}

if (!customElements.get(UI_TAB_LIST_TAG_NAME)) {
  customElements.define(UI_TAB_LIST_TAG_NAME, UiTabList)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_TAB_LIST_TAG_NAME]: UiTabList
  }
}
