import { ensureSelect, type UiSelect } from './ui-select'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import {
  CloseEventDetail,
  UI_SELECT_EVENTS,
  UI_SELECT_OPTION_TAG_NAME,
  ValueChangeEventDetail
} from './constants'

export class UiSelectOption extends HTMLElement {
  private _select: UiSelect | null = null
  private _target: HTMLElement | null = null
  private _valueUnSub: (() => void) | null = null
  private _disabledUnSub: (() => void) | null = null
  private _eventsController: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._select = ensureSelect(this, UI_SELECT_OPTION_TAG_NAME) as UiSelect
    this._render()
    this._handleTarget()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._select = null
    this._target = null
    this._valueUnSub?.()
    this._disabledUnSub?.()
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
        <style>
          :host {
            display:block;
            width:100%;
          }
          .select__option {
            width: 100%;
            box-sizing: border-box;
            padding: var(--ui-select-option-padding, var(--spacing-x-small));
            --ui-button-font-size: var(--ui-select-option-font-size, var(--font-size-small));
            --ui-button-line-height: var(--ui-select-option-line-height, var(--line-height-normal));
          }
        </style>
        <ui-button variant="ghost" class="select__option" type="button" part="base" role="option">
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
        exclude: ['as-child', 'value'],
        clearFromHost: true
      })
    } else {
      const button = this.shadowRoot?.querySelector('ui-button')
      this._target = (button ?? this) as HTMLElement
    }
  }

  private _setupListeners(): void {
    this._eventsController?.abort()
    this._eventsController = new AbortController()
    const signal = this._eventsController.signal
    this._target?.addEventListener('click', this._onClick, { signal })
    this._valueUnSub = this._select?.onValueChange((value) => this._syncValue(value)) ?? null
    this._disabledUnSub =
      this._select?.onDisabledChange((disabled) => this._syncDisabled(disabled)) ?? null
  }

  private _onClick = (event: MouseEvent): void => {
    event.preventDefault()
    if (!this._select || this._select.disabled) return
    const value = this.getAttribute('value') ?? null
    const selectId = this._select.instanceId

    this._select.dispatchEvent(
      new CustomEvent(UI_SELECT_EVENTS.VALUE_CHANGE, {
        bubbles: true,
        composed: true,
        detail: { value, selectId } satisfies ValueChangeEventDetail
      })
    )

    this._select.dispatchEvent(
      new CustomEvent(UI_SELECT_EVENTS.REQUEST_CLOSE, {
        bubbles: true,
        composed: true,
        detail: selectId !== undefined ? ({ selectId } satisfies CloseEventDetail) : undefined
      })
    )
  }

  private _syncValue(value?: string | null): void {
    if (!this._select) {
      this._select = ensureSelect(this, UI_SELECT_OPTION_TAG_NAME) as UiSelect
    }
    const selected = value ?? this._select.value
    if (selected && selected === this.getAttribute('value')) {
      this.setAttribute('aria-selected', 'true')
      this._target?.setAttribute('aria-selected', 'true')
    } else {
      this.setAttribute('aria-selected', 'false')
      this._target?.setAttribute('aria-selected', 'false')
    }
  }

  private _syncDisabled(disabled?: boolean): void {
    if (!this._target) return

    const disabledValue = disabled ?? !!this._select?.disabled

    if (disabledValue) {
      this._target.setAttribute('aria-disabled', 'true')
      this._target.setAttribute('disabled', '')
    } else {
      this._target.removeAttribute('aria-disabled')
      this._target.removeAttribute('disabled')
    }
  }
}

if (!customElements.get(UI_SELECT_OPTION_TAG_NAME)) {
  customElements.define(UI_SELECT_OPTION_TAG_NAME, UiSelectOption)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SELECT_OPTION_TAG_NAME]: UiSelectOption
  }
}
