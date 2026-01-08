import {
  ChangeValueEventDetail,
  UI_TAB_ATTRIBUTES,
  UI_TAB_EVENTS,
  UI_TAB_TAG_NAME
} from './constants'

export class UiTab extends HTMLElement {
  private _value: string | null = null

  static get observedAttributes(): string[] {
    return [UI_TAB_ATTRIBUTES.VALUE]
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <div part="base" role="tablist" aria-orientation="horizontal">
        <slot></slot>
      </div>
    `
  }

  connectedCallback(): void {
    this._render()
    this._setupListeners()
    this._init()
  }

  disconnectedCallback(): void {
    this.removeEventListener(
      UI_TAB_EVENTS.REQUEST_VALUE_CHANGE,
      this._onRequestValueChange as EventListener
    )
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === UI_TAB_ATTRIBUTES.VALUE) {
      this._setValue(value, { fromAttribute: true })
    }
  }

  private _setupListeners(): void {
    this.addEventListener(
      UI_TAB_EVENTS.REQUEST_VALUE_CHANGE,
      this._onRequestValueChange as EventListener
    )
  }

  private _init(): void {
    if (this.hasAttribute(UI_TAB_ATTRIBUTES.VALUE)) {
      this._setValue(this.getAttribute(UI_TAB_ATTRIBUTES.VALUE), {
        fromAttribute: true,
        suppressEvent: true
      })
    }
  }

  get value(): string | null {
    return this._value
  }

  set value(next: string | null) {
    this._setValue(next, { fromSetter: true })
  }

  private _setValue(
    next: string | null,
    options: {
      fromAttribute?: boolean
      fromSetter?: boolean
      suppressEvent?: boolean
    } = {}
  ): void {
    if (this._value === next) return
    this._value = next

    const attributeValue = next === null ? null : String(next)
    if (attributeValue === null) {
      if (this.hasAttribute(UI_TAB_ATTRIBUTES.VALUE)) {
        this.removeAttribute(UI_TAB_ATTRIBUTES.VALUE)
      }
    } else if (this.getAttribute(UI_TAB_ATTRIBUTES.VALUE) !== attributeValue) {
      this.setAttribute(UI_TAB_ATTRIBUTES.VALUE, attributeValue)
    }

    if (!options.suppressEvent) {
      this.dispatchEvent(
        new CustomEvent<ChangeValueEventDetail>(UI_TAB_EVENTS.VALUE_CHANGE, {
          detail: { value: this._value },
          bubbles: true,
          composed: true
        })
      )
    }
  }

  private _onRequestValueChange = (event: Event): void => {
    const custom = event as CustomEvent<ChangeValueEventDetail>
    if (!custom.detail) return
    const { value } = custom.detail
    this._setValue(value ?? null)
  }
}

if (!customElements.get(UI_TAB_TAG_NAME)) {
  customElements.define(UI_TAB_TAG_NAME, UiTab)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_TAB_TAG_NAME]: UiTab
  }
}
