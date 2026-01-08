import { ensureDialog, UiDialog } from './ui-dialog'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'
import { OpenEventDetail, UI_DIALOG_EVENTS, UI_DIALOG_TRIGGER_TAG_NAME } from './constants'

export class UiDialogTrigger extends HTMLElement {
  private _target: HTMLElement | null = null
  private _controller: AbortController | null = null
  private _dialog: UiDialog | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._dialog = ensureDialog(this, UI_DIALOG_TRIGGER_TAG_NAME)
    this._handleTarget()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._controller?.abort()
    this._target = null
    this._controller = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''

    // When `as-child` is present, render only the slot and expect a single
    // slotted child to act as the trigger (shadcn-style asChild behavior).
    // Otherwise, render a default internal button that wraps the slotted
    // content.
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

  private _setupListeners(): void {
    this._controller?.abort()
    this._controller = new AbortController()
    this._target?.addEventListener('click', this._onClick, {
      signal: this._controller.signal
    })
  }

  private _handleTarget(): void {
    if (this.hasAttribute('as-child')) {
      // as-child: enforce exactly one slotted child and delegate behavior to it.
      this._target = resolveAsChildTarget(this, {
        requireSingleChild: true
      })
      mergeHostAttributesToTarget(this, this._target, {
        exclude: ['as-child'],
        clearFromHost: true
      })
    } else {
      // Non as-child: use the internal button as the interactive target.
      const button = this.shadowRoot?.querySelector('ui-button')
      this._target = (button ?? this) as HTMLElement
    }
  }

  private _onClick(event: MouseEvent): void {
    if (!this._dialog) {
      this._dialog = ensureDialog(this, UI_DIALOG_TRIGGER_TAG_NAME)
    }
    event.preventDefault()
    this.dispatchEvent(
      new CustomEvent(UI_DIALOG_EVENTS.REQUEST_OPEN, {
        bubbles: true,
        composed: true,
        detail: {
          dialogId: this._dialog!.instanceId
        } satisfies OpenEventDetail
      })
    )
  }
}

if (!customElements.get(UI_DIALOG_TRIGGER_TAG_NAME)) {
  customElements.define(UI_DIALOG_TRIGGER_TAG_NAME, UiDialogTrigger)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_TRIGGER_TAG_NAME]: UiDialogTrigger
  }
}
