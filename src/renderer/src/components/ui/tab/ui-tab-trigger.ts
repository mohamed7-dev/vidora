import { type UiTab } from './ui-tab'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import {
  ChangeValueEventDetail,
  UI_TAB_EVENTS,
  UI_TAB_TAG_NAME,
  UI_TAB_TRIGGER_ATTRIBUTES,
  UI_TAB_TRIGGER_TAG_NAME
} from './constants'

export class UiTabTrigger extends HTMLElement {
  private _target: HTMLElement | null = null
  private _tabRoot: UiTab | null = null
  private _controller: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return [UI_TAB_TRIGGER_ATTRIBUTES.DISABLED]
  }

  attributeChangedCallback(name: string): void {
    if (name === UI_TAB_TRIGGER_ATTRIBUTES.DISABLED) {
      this._syncDisabled()
    }
  }

  connectedCallback(): void {
    this._render()
    this._tabRoot = this._findTabRoot()
    this._handleTarget()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._controller?.abort()
    this._controller = null
    this._target = null
    this._tabRoot = null
  }

  private _findTabRoot(): UiTab | null {
    const root = this.closest(UI_TAB_TAG_NAME)
    return (root as UiTab | null) ?? null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''

    if (this.hasAttribute('as-child')) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
          }
        </style>
        <slot></slot>
      `
    } else {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
          }
        </style>
        <ui-button block variant="ghost" type="button" part="base" role="tab">
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
      // Keep `value` on the host so the click handler can read it, even
      // though most other attributes are forwarded to the target.
      mergeHostAttributesToTarget(this, this._target, {
        exclude: ['as-child', 'value', 'disabled'],
        clearFromHost: true
      })
    } else {
      const button = this.shadowRoot?.querySelector('ui-button')
      this._target = (button ?? this) as HTMLElement
    }
    this._syncDisabled()
    this._syncAriaSelected()
  }

  private _setupListeners(): void {
    this._controller?.abort()
    this._controller = new AbortController()

    this._target?.addEventListener('click', this._onClick, {
      signal: this._controller.signal
    })

    this._target?.addEventListener('keydown', this._onKeyDown as EventListener, {
      signal: this._controller.signal
    })

    this._tabRoot?.addEventListener(
      UI_TAB_EVENTS.VALUE_CHANGE,
      this._onTabValueChange as EventListener,
      {
        signal: this._controller.signal
      } as AddEventListenerOptions
    )
  }

  private _onClick = (event: MouseEvent): void => {
    if (this.hasAttribute('disabled')) {
      event.preventDefault()
      return
    }
    event.preventDefault()
    const value = this.getAttribute('value')
    this.dispatchEvent(
      new CustomEvent<ChangeValueEventDetail>(UI_TAB_EVENTS.REQUEST_VALUE_CHANGE, {
        bubbles: true,
        composed: true,
        detail: { value }
      })
    )
  }

  private _onKeyDown = (event: KeyboardEvent): void => {
    if (this.hasAttribute('disabled')) return
    const key = event.key
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') {
      return
    }

    const triggers = this._getTriggersInScope()
    const enabledTriggers = triggers.filter((trigger) => !trigger.hasAttribute('disabled'))
    if (!enabledTriggers.length) return

    const currentIndex = enabledTriggers.indexOf(this)
    if (currentIndex === -1) return

    event.preventDefault()

    let nextIndex = currentIndex
    if (key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % enabledTriggers.length
    } else if (key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + enabledTriggers.length) % enabledTriggers.length
    } else if (key === 'Home') {
      nextIndex = 0
    } else if (key === 'End') {
      nextIndex = enabledTriggers.length - 1
    }

    const nextTrigger = enabledTriggers[nextIndex]
    nextTrigger._focusAndRequestSelection()
  }

  private _getTriggersInScope(): UiTabTrigger[] {
    const root = this._tabRoot ?? this._findTabRoot()
    if (!root) return []
    return Array.from(root.querySelectorAll<UiTabTrigger>(UI_TAB_TRIGGER_TAG_NAME))
  }

  private _focusAndRequestSelection(): void {
    if (this.hasAttribute('disabled')) return
    const value = this.getAttribute('value')
    this.dispatchEvent(
      new CustomEvent<ChangeValueEventDetail>(UI_TAB_EVENTS.REQUEST_VALUE_CHANGE, {
        bubbles: true,
        composed: true,
        detail: { value }
      })
    )
    this._target?.focus()
  }

  private _onTabValueChange = (event: Event): void => {
    const custom = event as CustomEvent<ChangeValueEventDetail>
    if (!custom.detail) return
    this._syncAriaSelected(custom.detail.value ?? null)
  }

  private _syncAriaSelected(currentValue?: string | null): void {
    if (!this._target) return
    const isDisabled = this.hasAttribute('disabled')
    const valueAttr = this.getAttribute('value')
    const rootValue =
      currentValue !== undefined
        ? currentValue
        : (this._tabRoot?.value ?? this._tabRoot?.getAttribute('value') ?? null)

    const isSelected =
      !isDisabled && valueAttr != null && rootValue != null && valueAttr === rootValue
    if (isSelected) {
      this.setAttribute('aria-selected', 'true')
      this._target.setAttribute('aria-selected', 'true')
      this._target.setAttribute('tabindex', '0')
      this._target.setAttribute('role', 'tab')
    } else {
      this.setAttribute('aria-selected', 'false')
      this._target.setAttribute('aria-selected', 'false')
      this._target.setAttribute('tabindex', '-1')
      this._target.setAttribute('role', 'tab')
    }
    this._syncDisabled()
  }

  private _syncDisabled(): void {
    if (!this._target) return
    const isDisabled = this.hasAttribute('disabled')

    if (isDisabled) {
      this._target.setAttribute('aria-disabled', 'true')
      this._target.setAttribute('disabled', '')
      this._target.setAttribute('tabindex', '-1')
    } else {
      this._target.removeAttribute('aria-disabled')
      this._target.removeAttribute('disabled')
      // tabindex is controlled by _syncAriaSelected based on selection
    }
  }
}

if (!customElements.get(UI_TAB_TRIGGER_TAG_NAME)) {
  customElements.define(UI_TAB_TRIGGER_TAG_NAME, UiTabTrigger)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_TAB_TRIGGER_TAG_NAME]: UiTabTrigger
  }
}
