import { type UiDropdown, ensureDropdown } from './ui-dropdown'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import {
  ToggleEventDetail,
  UI_DROPDOWN_CONTENT_TAG_NAME,
  UI_DROPDOWN_EVENTS,
  UI_DROPDOWN_TRIGGER_TAG_NAME
} from './constants'

export class UiDropdownTrigger extends HTMLElement {
  private _target: HTMLElement | null = null
  private _controller: AbortController | null = null
  private _dropdown: UiDropdown | null = null
  private _unsubscribeOpen: (() => void) | null = null
  private _unsubscribeDisabled: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._dropdown = ensureDropdown(this, UI_DROPDOWN_TRIGGER_TAG_NAME) as UiDropdown | null
    this._handleTarget()
    this._setupAria()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._controller?.abort()
    this._target = null
    this._controller = null
    if (this._unsubscribeOpen) {
      this._unsubscribeOpen()
      this._unsubscribeOpen = null
    }
    if (this._unsubscribeDisabled) {
      this._unsubscribeDisabled()
      this._unsubscribeDisabled = null
    }
    this._dropdown = null
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
        <ui-button variant="ghost" type="button" part="base">
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
  }

  private _setupAria(): void {
    if (!this._target) return

    // Indicate that this trigger opens a menu-style popup.
    this._target.setAttribute('aria-haspopup', 'menu')

    if (!this._dropdown) return

    // Reflect current open state.
    this._target.setAttribute('aria-expanded', String(!!this._dropdown.open))

    const content = this._dropdown.querySelector(UI_DROPDOWN_CONTENT_TAG_NAME) as HTMLElement | null
    if (content) {
      let id = content.getAttribute('id')
      if (!id) {
        id = `${UI_DROPDOWN_CONTENT_TAG_NAME}-${this._dropdown.instanceId}`
        content.setAttribute('id', id)
      }
      this._target.setAttribute('aria-controls', id)
    }
  }

  private _syncOpen(open: boolean): void {
    this._target?.setAttribute('aria-expanded', String(!!open))
  }

  private _syncDisabled(disabled?: boolean): void {
    if (!this._target) return
    const disabledValue = disabled ?? !!this._dropdown?.disabled
    if (disabledValue) {
      this._target.setAttribute('aria-disabled', 'true')
      this._target.setAttribute('disabled', '')
      this._target.tabIndex = -1
    } else {
      this._target.setAttribute('aria-disabled', 'false')
      this._target.removeAttribute('disabled')
      this._target.tabIndex = 0
    }
  }

  private _setupListeners(): void {
    this._controller?.abort()
    this._controller = new AbortController()
    const signal = this._controller.signal

    this._target?.addEventListener('click', this._onClick, { signal })

    if (this._dropdown) {
      if (!this._unsubscribeOpen) {
        this._unsubscribeOpen = this._dropdown.onOpenChange((open) => this._syncOpen(open))
      }

      if (!this._unsubscribeDisabled) {
        this._unsubscribeDisabled = this._dropdown.onDisabledChange((disabled) =>
          this._syncDisabled(disabled)
        )
      }
    }
  }

  private _onClick = (event: MouseEvent): void => {
    if (!this._dropdown) {
      this._dropdown = ensureDropdown(this, UI_DROPDOWN_TRIGGER_TAG_NAME)
    }
    if (!this._dropdown) return
    if (this._dropdown.disabled) {
      event.preventDefault()
      return
    }
    event.preventDefault()
    this.dispatchEvent(
      new CustomEvent(UI_DROPDOWN_EVENTS.REQUEST_TOGGLE, {
        bubbles: true,
        composed: true,
        detail: {
          menuId: this._dropdown.instanceId
        } satisfies ToggleEventDetail
      })
    )
  }

  //----------------------Public API----------------------

  focus(options?: FocusOptions): void {
    this._target?.focus(options)
  }
}

if (!customElements.get(UI_DROPDOWN_TRIGGER_TAG_NAME)) {
  customElements.define(UI_DROPDOWN_TRIGGER_TAG_NAME, UiDropdownTrigger)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DROPDOWN_TRIGGER_TAG_NAME]: UiDropdownTrigger
  }
}
