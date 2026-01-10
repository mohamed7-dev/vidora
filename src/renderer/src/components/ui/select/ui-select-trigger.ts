import { ensureSelect, type UiSelect } from './ui-select'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import {
  OpenEventDetail,
  UI_SELECT_CONTENT_TAG_NAME,
  UI_SELECT_EVENTS,
  UI_SELECT_TRIGGER_TAG_NAME
} from './constants'

export class UiSelectTrigger extends HTMLElement {
  private _target: HTMLElement | null = null
  private _controller: AbortController | null = null
  private _select: UiSelect | null = null
  private _unsubscribeOpen: (() => void) | null = null
  private _unsubscribeInvalid: (() => void) | null = null
  private _unsubscribeDisabled: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._findSelect()
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
    if (this._unsubscribeInvalid) {
      this._unsubscribeInvalid()
      this._unsubscribeInvalid = null
    }
    if (this._unsubscribeDisabled) {
      this._unsubscribeDisabled()
      this._unsubscribeDisabled = null
    }
    this._select = null
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
        <ui-button variant="outline" type="button" part="base">
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

    // Indicate that this trigger opens a listbox-style popup.
    this._target.setAttribute('aria-haspopup', 'listbox')

    // Reflect current open state.
    this._target.setAttribute('aria-expanded', String(!!this._select?.open))

    // Wire aria-controls to the associated content element so assistive
    // tech can relate the popup back to this trigger.
    const content = this._select?.querySelector(UI_SELECT_CONTENT_TAG_NAME) as HTMLElement | null
    if (content) {
      let id = content.getAttribute('id')
      if (!id) {
        id = `${UI_SELECT_CONTENT_TAG_NAME}-${this._select?.id}`
        content.setAttribute('id', id)
      }
      this._target.setAttribute('aria-controls', id)
    }
  }

  private _setupListeners(): void {
    this._controller?.abort()
    this._controller = new AbortController()
    this._target?.addEventListener('click', this._onClick, {
      signal: this._controller.signal
    })
    this._target?.addEventListener('blur', this._onBlur, {
      signal: this._controller.signal
    })
    this._unsubscribeInvalid =
      this._select?.onInvalidChange((invalid) => this._syncInvalid(invalid)) ?? null
    this._unsubscribeDisabled =
      this._select?.onDisabledChange((disabled) => this._syncDisabled(disabled)) ?? null
    this._unsubscribeOpen = this._select?.onOpenChange((open) => this._syncOpen(open)) ?? null
  }

  private _syncOpen(open: boolean): void {
    if (!this._target) return
    this._target.setAttribute('aria-expanded', String(!!open))
  }

  private _syncDisabled(disabled?: boolean): void {
    if (!this._target) return

    const disabledValue = disabled ?? !!this._select?.disabled

    if (disabledValue) {
      // Target should be removed from tab order when disabled so focus
      // traversal skips the trigger entirely.
      this._target.tabIndex = -1
      this._target.setAttribute('aria-disabled', 'true')
      this._target.setAttribute('disabled', '')
    } else {
      // Restore host tab stop when enabled so it participates in the
      // normal tab sequence inside dialogs/focus traps.
      this._target.tabIndex = 0
      this._target.removeAttribute('aria-disabled')
      this._target.removeAttribute('disabled')
    }
  }

  private _syncInvalid(invalid: boolean): void {
    if (invalid) {
      this._target?.setAttribute('aria-invalid', 'true')
    } else {
      this._target?.removeAttribute('aria-invalid')
    }
  }

  private _onClick = (event: MouseEvent): void => {
    if (!this._select) this._findSelect()
    if (this._select?.disabled) {
      event.preventDefault()
      return
    }
    event.preventDefault()
    if (this._select) {
      this._select.touched = true
    }
    this.dispatchEvent(
      new CustomEvent(UI_SELECT_EVENTS.REQUEST_OPEN, {
        bubbles: true,
        composed: true,
        detail: {
          selectId: this._select!.instanceId
        } satisfies OpenEventDetail
      })
    )
  }

  private _findSelect(): void {
    this._select = ensureSelect(this, UI_SELECT_TRIGGER_TAG_NAME) as UiSelect | null
  }

  private _onBlur = (): void => {
    if (this._select) {
      this._select.touched = true
    }
  }

  //----------------------Public API----------------------

  focus(options?: FocusOptions): void {
    this._target?.focus(options)
  }
}

if (!customElements.get(UI_SELECT_TRIGGER_TAG_NAME)) {
  customElements.define(UI_SELECT_TRIGGER_TAG_NAME, UiSelectTrigger)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SELECT_TRIGGER_TAG_NAME]: UiSelectTrigger
  }
}
