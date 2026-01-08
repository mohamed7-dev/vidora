import { ensureDropdown, type UiDropdown } from './ui-dropdown'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import { CloseEventDetail, UI_DROPDOWN_EVENTS, UI_DROPDOWN_ITEM_TAG_NAME } from './constants'

export class UiDropdownItem extends HTMLElement {
  private _dropdown: UiDropdown | null = null
  private _target: HTMLElement | null = null
  private _eventsController: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._dropdown = ensureDropdown(this, UI_DROPDOWN_ITEM_TAG_NAME) as UiDropdown | null
    this._render()
    this._handleTarget()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._dropdown = null
    this._target = null
    this._eventsController?.abort()
    this._eventsController = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''

    if (this.hasAttribute('as-child')) {
      this.shadowRoot.innerHTML = `
        <slot></slot>
      `
    } else {
      this.shadowRoot.innerHTML = `
        <ui-button variant="ghost" block class="dropdown__item" type="button" part="base" role="menuitem">
          <slot></slot>
        </ui-button>
      `
    }
  }

  private _handleTarget(): void {
    if (this.hasAttribute('as-child')) {
      this._target = resolveAsChildTarget(this, {
        requireSingleChild: true
      })
      mergeHostAttributesToTarget(this, this._target, {
        exclude: ['as-child'],
        clearFromHost: true
      })
    } else {
      const button = this.shadowRoot?.querySelector('ui-button')
      this._target = (button ?? this) as HTMLElement
    }

    this._target?.setAttribute('role', 'menuitem')
  }

  private _setupListeners(): void {
    this._eventsController?.abort()
    this._eventsController = new AbortController()
    const signal = this._eventsController.signal

    this._target?.addEventListener('click', this._onClick, { signal })
  }

  private _onClick = (): void => {
    if (!this._dropdown || this._dropdown.disabled) return

    // Let user-defined click handlers run first.
    // Then request the dropdown to close.
    this._dropdown.dispatchEvent(
      new CustomEvent(UI_DROPDOWN_EVENTS.REQUEST_CLOSE, {
        bubbles: true,
        composed: true,
        detail: {
          menuId: this._dropdown.instanceId
        } satisfies CloseEventDetail
      })
    )
  }
}

if (!customElements.get(UI_DROPDOWN_ITEM_TAG_NAME)) {
  customElements.define(UI_DROPDOWN_ITEM_TAG_NAME, UiDropdownItem)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DROPDOWN_ITEM_TAG_NAME]: UiDropdownItem
  }
}
