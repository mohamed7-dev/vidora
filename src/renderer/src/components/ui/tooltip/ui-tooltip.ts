import { ensureComponentWithRegistry } from '@renderer/lib/ui/dom-utils'
import {
  CloseEventDetail,
  OpenChangeEventDetail,
  OpenEventDetail,
  UI_TOOLTIP_ATTRIBUTES,
  UI_TOOLTIP_EVENTS,
  UI_TOOLTIP_TAG_NAME,
  UI_TOOLTIP_TRIGGER_TAG_NAME
} from './constants'
import type { UiTooltipTrigger } from './ui-tooltip-trigger'

let nextTooltipId = 1
const tooltipRegistery = new Map<string, UiTooltip>()

export class UiTooltip extends HTMLElement {
  private _open = false
  private readonly _instanceId: string
  private _eventsController: AbortController | null = null

  private _openListeners = new Set<(open: boolean) => void>()
  private _disabledListeners = new Set<(disabled: boolean) => void>()

  static get observedAttributes(): string[] {
    return [UI_TOOLTIP_ATTRIBUTES.OPEN, UI_TOOLTIP_ATTRIBUTES.DISABLED]
  }

  constructor() {
    super()
    this._instanceId = String(nextTooltipId++)
    this.attachShadow({ mode: 'open' })
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    switch (name) {
      case UI_TOOLTIP_ATTRIBUTES.OPEN:
        this._setOpen(value !== null, { fromAttribute: true })
        break
      case UI_TOOLTIP_ATTRIBUTES.DISABLED:
        this._notifyDisabled()
        break
    }
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <slot></slot>
    `
  }

  connectedCallback(): void {
    this._render()
    this._setupListeners()
    this._init()
    tooltipRegistery.set(this._instanceId, this)
  }

  disconnectedCallback(): void {
    this._eventsController?.abort()
    this._eventsController = null
    tooltipRegistery.delete(this._instanceId)
  }

  private _setupListeners(): void {
    this._eventsController?.abort()
    this._eventsController = new AbortController()
    const signal = this._eventsController.signal
    this.addEventListener(UI_TOOLTIP_EVENTS.OPEN_CHANGE, this._onOpenChange.bind(this), { signal })
    this.addEventListener(UI_TOOLTIP_EVENTS.REQUEST_OPEN, this._onRequestOpen.bind(this), {
      signal
    })
    this.addEventListener(UI_TOOLTIP_EVENTS.REQUEST_CLOSE, this._onRequestClose.bind(this), {
      signal
    })
  }

  private _init(): void {
    this.setAttribute(UI_TOOLTIP_ATTRIBUTES.INSTANCE_ID, this._instanceId)

    if (this.hasAttribute(UI_TOOLTIP_ATTRIBUTES.OPEN)) {
      this._setOpen(true, { fromAttribute: true })
    }

    this._notifyDisabled()
  }

  private _onRequestOpen(e: Event): void {
    if (this.disabled) return
    const custom = e as CustomEvent<OpenEventDetail>
    if (custom.detail.tooltipId !== this.instanceId) return
    this._setOpen(true)
  }

  private _onRequestClose(e: Event): void {
    const custom = e as CustomEvent<CloseEventDetail>
    if (custom.detail.tooltipId !== this.instanceId) return
    this._setOpen(false)
  }

  private _onOpenChange(e: Event): void {
    const custom = e as CustomEvent<OpenChangeEventDetail>
    if (custom.detail.tooltipId !== this.instanceId) return
    if (!custom.detail.open) {
      tooltipRegistery.delete(this.instanceId)
    }
  }

  private _setOpen(next: boolean, opts?: { fromAttribute?: boolean }): void {
    if (this._open === next) return
    this._open = next

    if (!opts?.fromAttribute) {
      if (next) this.setAttribute(UI_TOOLTIP_ATTRIBUTES.OPEN, '')
      else this.removeAttribute(UI_TOOLTIP_ATTRIBUTES.OPEN)
    }

    this.dispatchEvent(
      new CustomEvent(UI_TOOLTIP_EVENTS.OPEN_CHANGE, {
        detail: {
          open: this._open,
          tooltipId: this.instanceId
        } satisfies OpenChangeEventDetail,
        bubbles: true,
        composed: true
      })
    )

    for (const listener of this._openListeners) {
      try {
        listener(this._open)
      } catch {
        // ignore
      }
    }
  }

  private _notifyDisabled(): void {
    const disabled = this.disabled
    for (const listener of this._disabledListeners) {
      try {
        listener(disabled)
      } catch {
        // ignore
      }
    }
  }

  //-----------------------Public API-----------------------
  get open(): boolean {
    return this._open
  }

  set open(value: boolean) {
    this._setOpen(Boolean(value))
  }

  get instanceId(): string {
    return this._instanceId
  }

  get disabled(): boolean {
    return this.hasAttribute(UI_TOOLTIP_ATTRIBUTES.DISABLED)
  }

  set disabled(value: boolean) {
    if (value) this.setAttribute(UI_TOOLTIP_ATTRIBUTES.DISABLED, '')
    else this.removeAttribute(UI_TOOLTIP_ATTRIBUTES.DISABLED)
  }

  onOpenChange(listener: (open: boolean) => void): () => void {
    this._openListeners.add(listener)
    listener(this._open)
    return () => {
      this._openListeners.delete(listener)
    }
  }

  onDisabledChange(listener: (disabled: boolean) => void): () => void {
    this._disabledListeners.add(listener)
    listener(this.disabled)
    return () => {
      this._disabledListeners.delete(listener)
    }
  }

  focus(options?: FocusOptions): void {
    const trigger = this.querySelector(UI_TOOLTIP_TRIGGER_TAG_NAME) as UiTooltipTrigger | null
    if (trigger) {
      trigger.focus(options)
      return
    }
    super.focus(options)
  }
}

if (!customElements.get(UI_TOOLTIP_TAG_NAME)) {
  customElements.define(UI_TOOLTIP_TAG_NAME, UiTooltip)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_TOOLTIP_TAG_NAME]: UiTooltip
  }
}

export function ensureTooltip(
  compoenentTree: HTMLElement,
  componentTag: string,
  options?: { shouldThrow: boolean }
): UiTooltip | null {
  return ensureComponentWithRegistry<UiTooltip>(
    compoenentTree,
    componentTag,
    UI_TOOLTIP_TAG_NAME,
    UI_TOOLTIP_ATTRIBUTES.INSTANCE_ID,
    tooltipRegistery,
    options
  )
}
