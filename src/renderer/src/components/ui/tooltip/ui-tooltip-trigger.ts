import { type UiTooltip, ensureTooltip } from './ui-tooltip'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import {
  CloseEventDetail,
  OpenEventDetail,
  UI_TOOLTIP_CONTENT_TAG_NAME,
  UI_TOOLTIP_EVENTS,
  UI_TOOLTIP_TRIGGER_TAG_NAME
} from './constants'

export class UiTooltipTrigger extends HTMLElement {
  private _target: HTMLElement | null = null
  private _controller: AbortController | null = null
  private _tooltip: UiTooltip | null = null
  private _unsubscribeOpen: (() => void) | null = null
  private _unsubscribeDisabled: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._findTooltip()
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
    this._tooltip = null
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

    this._target.setAttribute('aria-describedby', '')

    const tooltip = this._tooltip
    if (!tooltip) return

    const content = tooltip.querySelector(UI_TOOLTIP_CONTENT_TAG_NAME) as HTMLElement | null
    if (content) {
      let id = content.getAttribute('id')
      if (!id) {
        id = `${UI_TOOLTIP_CONTENT_TAG_NAME}-${tooltip.id}`
        content.setAttribute('id', id)
      }
      this._target.setAttribute('aria-describedby', id)
    }
  }

  private _syncDisabled(disabled?: boolean): void {
    if (!this._target) return
    const isDisabled = disabled ?? !!this._tooltip?.disabled
    if (isDisabled) {
      this._target.setAttribute('aria-disabled', 'true')
    } else {
      this._target.removeAttribute('aria-disabled')
    }
  }

  private _setupListeners(): void {
    this._controller?.abort()
    this._controller = new AbortController()
    const signal = this._controller.signal

    if (!this._target) return

    const open = (): void => {
      if (!this._tooltip || this._tooltip.disabled) return
      this.dispatchEvent(
        new CustomEvent(UI_TOOLTIP_EVENTS.REQUEST_OPEN, {
          bubbles: true,
          composed: true,
          detail: {
            tooltipId: this._tooltip.instanceId
          } satisfies OpenEventDetail
        })
      )
    }

    const close = (): void => {
      if (!this._tooltip) return
      this.dispatchEvent(
        new CustomEvent(UI_TOOLTIP_EVENTS.REQUEST_CLOSE, {
          bubbles: true,
          composed: true,
          detail: {
            tooltipId: this._tooltip.instanceId
          } satisfies CloseEventDetail
        })
      )
    }

    this._target.addEventListener('mouseenter', open, { signal })
    this._target.addEventListener('mouseleave', close, { signal })
    this._target.addEventListener('focus', open, { signal })
    this._target.addEventListener('blur', close, { signal })

    if (!this._unsubscribeDisabled) {
      const tooltip = this._tooltip || this._findTooltip()
      if (!tooltip) return
      this._unsubscribeDisabled = tooltip.onDisabledChange((disabled) => {
        this._syncDisabled(disabled)
      })
    }
  }

  private _findTooltip(): void {
    this._tooltip = ensureTooltip(this, UI_TOOLTIP_TRIGGER_TAG_NAME)
  }

  focus(options?: FocusOptions): void {
    this._target?.focus(options)
  }
}

if (!customElements.get(UI_TOOLTIP_TRIGGER_TAG_NAME)) {
  customElements.define(UI_TOOLTIP_TRIGGER_TAG_NAME, UiTooltipTrigger)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_TOOLTIP_TRIGGER_TAG_NAME]: UiTooltipTrigger
  }
}
