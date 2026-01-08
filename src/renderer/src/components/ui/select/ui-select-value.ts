import { UI_SELECT_OPTION_TAG_NAME, UI_SELECT_VALUE_TAG_NAME } from './constants'
import { ensureSelect, UiSelect } from './ui-select'

export class UiSelectValue extends HTMLElement {
  private _select: UiSelect | null = null
  private _unsubscribe: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return ['placeholder']
  }

  connectedCallback(): void {
    this._render()
    this._attachToSelect()
  }

  disconnectedCallback(): void {
    if (this._unsubscribe) {
      this._unsubscribe()
      this._unsubscribe = null
    }
    this._select = null
  }

  attributeChangedCallback(name: string): void {
    if (name === 'placeholder') {
      const currentValue = this._select ? this._select.value : null
      this._syncFromSelect(currentValue)
    }
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .select__value {
          display: inline-flex;
          align-items: center;
          gap: var(--ui-select-value-gap, var(--spacing-2x-small));
        }
      </style>
      <span class="select__value" part="base" data-el="value"></span>
    `
  }

  private _attachToSelect(): void {
    this._select = ensureSelect(this, UI_SELECT_VALUE_TAG_NAME) as UiSelect | null
    if (!this._select) return

    // Initial sync.
    this._syncFromSelect(this._select.value)

    // Subscribe to future changes.
    this._unsubscribe = this._select.onValueChange((value) => {
      this._syncFromSelect(value)
    })
  }

  private _syncFromSelect(value: string | null): void {
    const span = this.shadowRoot?.querySelector("[data-el='value']") as HTMLSpanElement | null
    if (!span) return

    if (!this._select || value == null) {
      const placeholder = this.getAttribute('placeholder')
      span.textContent = placeholder ?? ''
      return
    }

    // Try to find a matching option inside this select and use its
    // text content as the display label.
    let label = value
    try {
      const escaped = window.CSS?.escape ? window.CSS.escape(value) : value.replace(/"/g, '\\"')
      const option = this._select.querySelector<HTMLElement>(
        `${UI_SELECT_OPTION_TAG_NAME}[value="${escaped}"]`
      )
      if (option) {
        label = option.textContent?.trim() || value
      }
    } catch {
      // Fallback: just show the raw value.
      label = value
    }

    span.textContent = label
  }
}

if (!customElements.get(UI_SELECT_VALUE_TAG_NAME)) {
  customElements.define(UI_SELECT_VALUE_TAG_NAME, UiSelectValue)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SELECT_VALUE_TAG_NAME]: UiSelectValue
  }
}
