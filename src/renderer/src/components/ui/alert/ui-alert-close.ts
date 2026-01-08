import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import {
  UI_ALERT_CLOSE_ATTRIBUTES,
  UI_ALERT_CLOSE_EVENT_PAYLOAD,
  UI_ALERT_CLOSE_TAG_NAME,
  UI_ALERT_EVENTS
} from './constants'
import { ensureAlert, type UIAlert } from './ui-alert'

export class UiAlertClose extends HTMLElement {
  private _target: HTMLElement | null = null
  private _alert: UIAlert | null = null
  private _eventsController: AbortController | null = null
  private _onClosableChangeCleanup: (() => void) | undefined = undefined
  private _onVariantChangeCleanup: (() => void) | undefined = undefined

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return [UI_ALERT_CLOSE_ATTRIBUTES.DISABLED]
  }

  attributeChangedCallback(name: string): void {
    if (name === UI_ALERT_CLOSE_ATTRIBUTES.DISABLED) {
      this._syncDisabled()
    }
  }

  connectedCallback(): void {
    this._alert = ensureAlert(this, UI_ALERT_CLOSE_TAG_NAME) as UIAlert | null
    this._onClosableChangeCleanup = this._alert?.onClosableChange(() => {
      this._syncClosable()
    })
    this._onVariantChangeCleanup = this._alert?.onVariantChange(() => {
      this._syncVariant()
    })
    this._render()
    this._handleTarget()
    this._setupListeners()
    this._syncDisabled()
  }

  disconnectedCallback(): void {
    this._eventsController?.abort()
    this._eventsController = null
    this._target = null
    this._onClosableChangeCleanup?.()
    this._onVariantChangeCleanup?.()
    this._onClosableChangeCleanup = undefined
    this._onVariantChangeCleanup = undefined
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
              display: inline-flex;
            }
            :host([closable="false"]) {
              display: none;
            }
        </style>
        <ui-button variant="${
          this.variant === 'destructive' ? 'destructive' : 'ghost'
        }" size="icon" class="alert__close" type="button" part="base">
          <ui-icon name="x"></ui-icon>
        </ui-button>
      `
    }
  }

  private _syncClosable(): void {
    if (!this._alert || !this._alert.closable) {
      this.setAttribute(UI_ALERT_CLOSE_ATTRIBUTES.CLOSABLE, 'false')
    } else {
      this.setAttribute(UI_ALERT_CLOSE_ATTRIBUTES.CLOSABLE, 'true')
    }
  }

  private _syncVariant(): void {
    if (!this._alert) return
    const variant = this._alert.variant
    this.setAttribute(UI_ALERT_CLOSE_ATTRIBUTES.VARIANT, variant)
  }

  private _syncDisabled(): void {
    if (this._target) {
      ;(this._target as HTMLButtonElement).disabled = this.disabled
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

  private _setupListeners(): void {
    this._eventsController?.abort()
    this._eventsController = new AbortController()
    this._target?.addEventListener('click', this._onClick, {
      signal: this._eventsController.signal
    })
  }

  private _onClick = (event: MouseEvent): void => {
    event.preventDefault()
    if (!this._alert || this.disabled) return
    const alertInstanceId = this._alert.instanceId
    this.dispatchEvent(
      new CustomEvent<UI_ALERT_CLOSE_EVENT_PAYLOAD>(UI_ALERT_EVENTS.REQUEST_CLOSE, {
        bubbles: true,
        composed: true,
        detail: { alertInstanceId }
      })
    )
  }

  focus(): void {
    this._target?.focus()
  }

  get disabled(): boolean {
    return this.hasAttribute(UI_ALERT_CLOSE_ATTRIBUTES.DISABLED)
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute(UI_ALERT_CLOSE_ATTRIBUTES.DISABLED, '')
    } else {
      this.removeAttribute(UI_ALERT_CLOSE_ATTRIBUTES.DISABLED)
    }
  }

  get variant(): string {
    return this.getAttribute(UI_ALERT_CLOSE_ATTRIBUTES.VARIANT) || 'default'
  }
}

if (!customElements.get(UI_ALERT_CLOSE_TAG_NAME)) {
  customElements.define(UI_ALERT_CLOSE_TAG_NAME, UiAlertClose)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_ALERT_CLOSE_TAG_NAME]: UiAlertClose
  }
}
