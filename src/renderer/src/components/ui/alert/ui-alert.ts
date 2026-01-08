import { ensureComponentWithRegistry } from '@renderer/lib/ui/dom-utils'
import {
  UI_ALERT_ATTRIBUTES,
  UI_ALERT_CLOSE_EVENT_PAYLOAD,
  UI_ALERT_CONTENT_TAG_NAME,
  UI_ALERT_EVENTS,
  UI_ALERT_OPEN_CHANGE_EVENT_PAYLOAD,
  UI_ALERT_TAG_NAME,
  UI_ALERT_TITLE_TAG_NAME,
  UIAlertVariant
} from './constants'
import { type UiAlertContent } from './ui-alert-content'
import { type UIAlertTitle } from './ui-alert-title'

let nextAlertId = 1
const alertRegistry = new Map<string, UIAlert>()

export class UIAlert extends HTMLElement {
  // refs
  private _titleEl: UIAlertTitle | null = null
  private _contentEl: UiAlertContent | null = null

  // Simple listener registries for reactive props
  private _openListeners = new Set<(open: boolean) => void>()
  private _closableListeners = new Set<(closable: boolean) => void>()
  private _variantListeners = new Set<(variant: UIAlertVariant) => void>()
  private _eventsController: AbortController | null = null
  private _open = false
  private _instanceId = ''
  private _lastFocusedElement: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this._instanceId = `${nextAlertId++}`

    // Programmatically focusable only: keep the host out of the tab
    // order but allow focus() to move focus here when needed.
    if (!this.hasAttribute('tabindex')) {
      this.tabIndex = -1
    }
  }

  static get observedAttributes(): string[] {
    return [UI_ALERT_ATTRIBUTES.VARIANT, UI_ALERT_ATTRIBUTES.CLOSABLE, UI_ALERT_ATTRIBUTES.OPEN]
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case UI_ALERT_ATTRIBUTES.OPEN:
        this._setOpen(value !== null, { fromAttribute: true })
        break
      case UI_ALERT_ATTRIBUTES.VARIANT:
        this._setVariant()
        break
      case UI_ALERT_ATTRIBUTES.CLOSABLE:
        this._setClosable()
        break
    }
  }

  connectedCallback(): void {
    this._render()
    this._cacheRefs()
    this._init()
    this._setupListeners()
    alertRegistry.set(this._instanceId, this)
  }

  disconnectedCallback(): void {
    this._eventsController?.abort()
    this._eventsController = null
    alertRegistry.delete(this._instanceId)
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
            }
            :host([data-open="false"]) {
                display: none;
            }
            .alert {
              display: flex;
              flex-direction: column;
              gap: var(--ui-alert-gap, var(--spacing-small));
              padding: var(--ui-alert-padding, var(--spacing-x-small));
              border-radius: var(--ui-alert-radius, var(--radius));
              border: 1px solid transparent;
              box-sizing: border-box;
              width: 100%;
            }
            :host([variant='default']) .alert,
            .alert {
              background-color: var(--ui-alert-default-bg, transparent);
              border-color: var(--ui-alert-default-border, color-mix(in srgb, var(--primary) 20%, transparent));
            }
            :host([variant='destructive']) .alert {
              background-color: var(--ui-alert-destructive-bg, transparent);
              border-color: var(--ui-alert-destructive-border, color-mix(in srgb, var(--destructive) 30%, transparent));
            } 
        </style>
        <article part="base" class="alert">
            <slot></slot>
        </article>
    `
  }

  private _cacheRefs(): void {
    this._titleEl = this.querySelector(`${UI_ALERT_TITLE_TAG_NAME}`) as UIAlertTitle | null
    this._contentEl = this.querySelector(`${UI_ALERT_CONTENT_TAG_NAME}`) as UiAlertContent | null
  }

  private _init(): void {
    this.setAttribute(UI_ALERT_ATTRIBUTES.INSTANCE_ID, this.instanceId)
    if (this.titleId && this._titleEl) {
      this.setAttribute('aria-labelledby', this.titleId)
    }
    if (this.contentId && this._contentEl) {
      this.setAttribute('aria-describedby', this.contentId)
    }
    // Ensure initial open state is always reflected via _setOpen so
    // data-open/data-closable and consumers are in sync, regardless of
    // whether the open attribute was provided.
    if (this.hasAttribute(UI_ALERT_ATTRIBUTES.OPEN)) {
      this._setOpen(true, { fromAttribute: true })
    } else {
      this._setOpen(false, { fromAttribute: true })
    }
    this._syncAria()
  }

  private _setupListeners(): void {
    this._eventsController?.abort()
    this._eventsController = new AbortController()
    this.addEventListener(UI_ALERT_EVENTS.REQUEST_CLOSE, this._onRequestClose.bind(this), {
      signal: this._eventsController.signal
    })
    this.addEventListener(UI_ALERT_EVENTS.OPEN_CHANGE, this._onOpenChange.bind(this), {
      signal: this._eventsController.signal
    })
  }

  private _onRequestClose(event: Event): void {
    const custom = event as CustomEvent<UI_ALERT_CLOSE_EVENT_PAYLOAD>
    const detailId = custom.detail?.alertInstanceId
    // If a specific alertInstanceId is provided and it doesn't match, ignore this request.
    if (detailId && detailId !== this.instanceId) return
    this._setOpen(false)
  }

  private _onOpenChange(event: Event): void {
    const custom = event as CustomEvent<UI_ALERT_OPEN_CHANGE_EVENT_PAYLOAD>
    const detailId = custom.detail?.alertInstanceId
    if (detailId && detailId !== this.instanceId) return
    if (!custom.detail?.open) {
      alertRegistry.delete(this.instanceId)
    }
  }

  private _setVariant(): void {
    this._syncAria()
    // Notify any subscribed listeners.
    for (const listener of this._variantListeners) {
      try {
        listener(this.variant)
      } catch {
        // ignore listener errors
      }
    }
  }

  private _setClosable(): void {
    // Notify any subscribed listeners.
    for (const listener of this._closableListeners) {
      try {
        listener(this.closable)
      } catch {
        // ignore listener errors
      }
    }
  }

  private _setOpen(next: boolean, opts?: { fromAttribute?: boolean }): void {
    const wasOpen = this._open
    this._open = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_ALERT_ATTRIBUTES.OPEN, '')
      else this.removeAttribute(UI_ALERT_ATTRIBUTES.OPEN)
    }

    this.dispatchEvent(
      new CustomEvent(UI_ALERT_EVENTS.OPEN_CHANGE, {
        detail: { open: this._open, alertInstanceId: this.instanceId },
        bubbles: true,
        composed: true
      })
    )

    // Notify any subscribed listeners.
    for (const listener of this._openListeners) {
      try {
        listener(this._open)
      } catch {
        // ignore listener errors
      }
    }

    // Manage focus: when the alert opens, remember the element that was
    // focused so we can restore focus after closing.
    if (next && !wasOpen) {
      const root = this.getRootNode() as Document | ShadowRoot
      const active = (root as Document).activeElement ?? (root as ShadowRoot).activeElement ?? null

      if (active instanceof HTMLElement && active !== this && !this.contains(active)) {
        this._lastFocusedElement = active
      } else {
        this._lastFocusedElement = null
      }
    }

    // When closing, attempt to restore focus to the last focused
    // element, if it is still in the document and focusable.
    if (!next && wasOpen && this._lastFocusedElement) {
      if (document.contains(this._lastFocusedElement)) {
        this._lastFocusedElement.focus()
      }
      this._lastFocusedElement = null
    }
    this.setAttribute('data-open', String(this._open))
    this.setAttribute('data-closable', String(this.closable))
  }

  // Expose a focus method that simply delegates to the HTMLElement
  // behavior. Combined with tabindex="-1" this makes the alert
  // programmatically focusable but keeps it out of the tab order.
  focus(options?: FocusOptions): void {
    super.focus(options)
  }

  private _syncAria(): void {
    this.variant === 'destructive'
      ? this.setAttribute('role', 'alert')
      : this.setAttribute('role', 'status')

    this.variant === 'destructive'
      ? this.setAttribute('aria-live', 'assertive')
      : this.setAttribute('aria-live', 'polite')
  }

  //---------------------------------Public API-------------------------------
  show(): void {
    this._setOpen(true)
  }

  hide(): void {
    this._setOpen(false)
  }

  get variant(): UIAlertVariant {
    return (this.getAttribute(UI_ALERT_ATTRIBUTES.VARIANT) as UIAlertVariant) || 'default'
  }

  set variant(variant: UIAlertVariant | null) {
    this.setAttribute(UI_ALERT_ATTRIBUTES.VARIANT, variant ?? 'default')
  }

  get closable(): boolean {
    return this.hasAttribute(UI_ALERT_ATTRIBUTES.CLOSABLE)
  }

  set closable(isClosable: boolean) {
    if (!isClosable) {
      this.removeAttribute(UI_ALERT_ATTRIBUTES.CLOSABLE)
    } else {
      this.setAttribute(UI_ALERT_ATTRIBUTES.CLOSABLE, '')
    }
  }

  get open(): boolean {
    return this._open
  }

  set open(value: boolean) {
    this._setOpen(Boolean(value))
  }

  get instanceId(): string {
    return `${UI_ALERT_TAG_NAME}-${this._instanceId}`
  }

  get titleId(): string {
    return `${UI_ALERT_TITLE_TAG_NAME}-${this.instanceId}`
  }
  get contentId(): string {
    return `${UI_ALERT_CONTENT_TAG_NAME}-${this.instanceId}`
  }

  //----Listener registration APIs. Each returns an unsubscribe function.----
  onOpenChange(listener: (open: boolean) => void): () => void {
    this._openListeners.add(listener)
    // Immediately notify with the current state so subscribers don't
    // have to special-case the initial value.
    listener(this._open)
    return () => {
      this._openListeners.delete(listener)
    }
  }

  onVariantChange(listener: (variant: UIAlertVariant) => void): () => void {
    this._variantListeners.add(listener)
    // Immediately emit the current variant so subscribers are in sync
    // on first registration.
    listener(this.variant)
    return () => {
      this._variantListeners.delete(listener)
    }
  }

  onClosableChange(listener: (closable: boolean) => void): () => void {
    this._closableListeners.add(listener)
    // Immediately emit the current closable state.
    listener(this.closable)
    return () => {
      this._closableListeners.delete(listener)
    }
  }
}

if (!customElements.get(UI_ALERT_TAG_NAME)) {
  customElements.define(UI_ALERT_TAG_NAME, UIAlert)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_ALERT_TAG_NAME]: UIAlert
  }
}

export function ensureAlert(
  componentTreeRoot: HTMLElement,
  componentTag: string,
  options?: { shouldThrow: boolean }
): UIAlert | null {
  return ensureComponentWithRegistry<UIAlert>(
    componentTreeRoot,
    componentTag,
    UI_ALERT_TAG_NAME,
    UI_ALERT_ATTRIBUTES.INSTANCE_ID,
    alertRegistry,
    options
  )
}
