import { createDismissibleLayer } from '@renderer/lib/ui/dismissable-layer'
import type { DismissibleLayer } from '@renderer/lib/ui/dismissable-layer'
import { createFocusTrap, type FocusTrapHandle } from '@renderer/lib/ui/focus-trap'
import { createPresenceAnimator, type PresenceAnimator } from '@renderer/lib/ui/animation'
import { acquireScrollLock, type ScrollLockRelease } from '@renderer/lib/ui/scroll-locking'
import { ensureDialog, type UiDialog } from './ui-dialog'
import {
  CloseEventDetail,
  UI_DIALOG_CONTENT_TAG_NAME,
  UI_DIALOG_EVENTS,
  UI_DIALOG_PORTAL_TAG_NAME
} from './constants'

/**
 * <ui-dialog-portal>
 *
 * Declarative behavior wrapper for a <ui-dialog> subtree.
 *
 * Usage:
 *   <ui-dialog>
 *     <ui-dialog-trigger>Open</ui-dialog-trigger>
 *     <ui-dialog-portal>
 *       <ui-dialog-overlay></ui-dialog-overlay>
 *       <ui-dialog-content>...</ui-dialog-content>
 *     </ui-dialog-portal>
 *   </ui-dialog>
 *
 * When the nearest ancestor <ui-dialog> is open, this element:
 * - treats its own light-DOM children as the active dialog subtree
 * - wires Escape / outside-click dismissal back to the dialog via events
 * - manages document inertness and focus trapping while open
 *
 * No portalling is performed: dialog content remains in place in the DOM.
 */
export class UiDialogPortal extends HTMLElement {
  private _dismissible: DismissibleLayer | null = null
  private _dialog: UiDialog | null = null
  private _focusTrap: FocusTrapHandle | null = null
  private _animator: PresenceAnimator | null = null
  private _contentRoot: HTMLElement | null = null
  private _releaseScrollLock: ScrollLockRelease | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._findDialog()
    this._setupListeners()
    this._init()
  }

  disconnectedCallback(): void {
    this._dialog?.removeEventListener(
      UI_DIALOG_EVENTS.OPEN_CHANGE,
      this._onDialogOpenChange as EventListener
    )
    this._dialog = null
    this._teardownOpenState()
  }

  private _findDialog(): UiDialog | null {
    const dialog = ensureDialog(this, UI_DIALOG_PORTAL_TAG_NAME)
    this._dialog = dialog
    return dialog
  }

  private _setupListeners(): void {
    this._dialog?.addEventListener(
      UI_DIALOG_EVENTS.OPEN_CHANGE,
      this._onDialogOpenChange as EventListener
    )
  }

  private _init(): void {
    // If the dialog is already open when this connects, mount immediately.
    if (this._dialog?.open) {
      this._onDialogOpened()
    }
  }

  private _onDialogOpenChange = (event: Event): void => {
    const custom = event as CustomEvent<{ open: boolean }>
    if (!custom.detail) return
    if (custom.detail.open) {
      this._onDialogOpened()
    } else {
      this._teardownOpenState()
    }
  }

  private _onDialogOpened(): void {
    const dialog = this._findDialog()
    if (!dialog) return

    // Ensure the shadow root provides a full-viewport, fixed container
    // that centers the projected dialog content, without using transforms
    // (so position: fixed children like ui-select remain viewport-relative).
    if (this.shadowRoot && !this.shadowRoot.querySelector('.root')) {
      this.shadowRoot.innerHTML = `
        <style>
          .root {
            position: fixed;
            inset: 0;
            z-index: var(--z-index-dialog);
            display: flex;
            align-items: center;
            justify-content: center;
          }
        </style>
        <div class="root">
          <slot></slot>
        </div>
      `
    }

    // Remember the dialog content root within this subtree. If it doesn't
    // exist yet, fall back to the portal host itself.
    this._contentRoot = this.querySelector(UI_DIALOG_CONTENT_TAG_NAME) as HTMLElement | null

    const isAlert = dialog.alert

    const inertRoot = (this._contentRoot ?? this) as HTMLElement

    // Use dismissible layer semantics (Escape + pointer-outside) bound to
    // the in-place dialog subtree instead of a separate portal host.
    this._dismissible = createDismissibleLayer({
      hostElement: inertRoot,
      onDismiss: () => {
        const dialogId = dialog.instanceId
        dialog.dispatchEvent(
          new CustomEvent(UI_DIALOG_EVENTS.REQUEST_CLOSE, {
            bubbles: true,
            composed: true,
            detail: dialogId !== undefined ? ({ dialogId } satisfies CloseEventDetail) : undefined
          })
        )
      },
      dismissOnEscape: !isAlert,
      dismissOnPointerDownOutside: !isAlert,
      isInside: (_event, path) => {
        if (!this._contentRoot) return true
        return path.includes(this._contentRoot)
      }
    })

    // Trap focus within the dialog content while the dialog is open.
    const trapContainer = (this._contentRoot ?? this) as HTMLElement
    this._focusTrap = createFocusTrap(trapContainer, {
      loop: true
    })
    this._focusTrap.activate()

    // Lock document scrolling while the dialog is open.
    this._releaseScrollLock = acquireScrollLock()

    // Animate dialog presence on the portal's fixed container (.root) using
    // opacity only. This avoids transforms / clip-path on ancestors of
    // nested fixed overlays (e.g. ui-select), so positioning semantics stay
    // correct and content is not clipped.
    const rootForAnimation = this.shadowRoot?.querySelector('.root') as HTMLElement | null
    if (rootForAnimation) {
      this._animator = createPresenceAnimator(
        rootForAnimation,
        [{ opacity: 0 }, { opacity: 1 }],
        [{ opacity: 1 }, { opacity: 0 }],
        {
          duration: 150,
          easing: 'ease-out'
        }
      )
      // Fire and forget; utility respects prefers-reduced-motion.
      void this._animator.enter()
    } else {
      this._animator = null
    }
  }

  private async _teardownOpenState(): Promise<void> {
    // Play exit animation before cleaning up state.
    if (this._animator) {
      await this._animator.exit()
      this._animator?.cancel?.()
      this._animator = null
    }

    if (this._focusTrap) {
      this._focusTrap.destroy()
      this._focusTrap = null
    }

    if (this._dismissible) {
      this._dismissible.destroy()
      this._dismissible = null
    }

    if (this._releaseScrollLock) {
      this._releaseScrollLock()
      this._releaseScrollLock = null
    }

    this._contentRoot = null
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = ''
    }
  }
}

if (!customElements.get(UI_DIALOG_PORTAL_TAG_NAME)) {
  customElements.define(UI_DIALOG_PORTAL_TAG_NAME, UiDialogPortal)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_PORTAL_TAG_NAME]: UiDialogPortal
  }
}
