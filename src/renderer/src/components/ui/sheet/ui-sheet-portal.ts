import { createDismissibleLayer } from '@renderer/lib/ui/dismissable-layer'
import type { DismissibleLayer } from '@renderer/lib/ui/dismissable-layer'
import { createFocusTrap, type FocusTrapHandle } from '@renderer/lib/ui/focus-trap'
import { createPresenceAnimator, type PresenceAnimator } from '@renderer/lib/ui/animation'
import { acquireScrollLock, type ScrollLockRelease } from '@renderer/lib/ui/scroll-locking'
import { ensureSheet, UiSheet } from './ui-sheet'
import { UI_SHEET_CONTENT_TAG_NAME, UI_SHEET_EVENTS, UI_SHEET_PORTAL_TAG_NAME } from './constants'

/**
 * <ui-sheet-portal>
 *
 * Declarative behavior wrapper for a <ui-sheet> subtree.
 *
 * Usage:
 *   <ui-sheet>
 *     <ui-sheet-trigger>Open</ui-sheet-trigger>
 *     <ui-sheet-portal>
 *       <ui-sheet-overlay></ui-sheet-overlay>
 *       <ui-sheet-content>...</ui-sheet-content>
 *     </ui-sheet-portal>
 *   </ui-sheet>
 *
 * When the nearest ancestor <ui-sheet> is open, this element:
 * - treats its own light-DOM children as the active sheet subtree
 * - wires Escape / outside-click dismissal back to the sheet via events
 * - manages scroll locking and focus trapping while open
 *
 * No light-DOM portalling is performed: sheet content remains in place in the
 * DOM. The shadow DOM only provides a full-viewport fixed container, without
 * transforms, so nested fixed-position overlays (e.g. selects) stay
 * viewport-relative.
 */
export class UiSheetPortal extends HTMLElement {
  private _dismissible: DismissibleLayer | null = null
  private _sheet: UiSheet | null = null
  private _focusTrap: FocusTrapHandle | null = null
  private _animator: PresenceAnimator | null = null
  private _contentRoot: HTMLElement | null = null
  private _releaseScrollLock: ScrollLockRelease | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._findSheet()
    this._setupListeners()
    this._init()
  }

  disconnectedCallback(): void {
    this._sheet?.removeEventListener(
      UI_SHEET_EVENTS.OPEN_CHANGE,
      this._onSheetOpenChange as EventListener
    )
    this._sheet = null
    this._teardownOpenState()
  }

  private _findSheet(): UiSheet | null {
    const sheet = ensureSheet(this, UI_SHEET_PORTAL_TAG_NAME)
    this._sheet = sheet
    return sheet
  }

  private _setupListeners(): void {
    this._sheet?.addEventListener(
      UI_SHEET_EVENTS.OPEN_CHANGE,
      this._onSheetOpenChange as EventListener
    )
  }

  private _init(): void {
    // If the sheet is already open when this connects, mount immediately.
    if (this._sheet?.open) {
      this._onSheetOpened()
    }
  }

  private _onSheetOpenChange = (event: Event): void => {
    const custom = event as CustomEvent<{ open: boolean }>
    if (!custom.detail) return
    if (custom.detail.open) {
      this._onSheetOpened()
    } else {
      this._teardownOpenState()
    }
  }

  private _onSheetOpened(): void {
    const sheet = this._findSheet()
    if (!sheet) return

    // Ensure the shadow root provides a full-viewport, fixed container
    // without transforms, so nested fixed overlays remain viewport-relative.
    if (this.shadowRoot && !this.shadowRoot.querySelector('.root')) {
      this.shadowRoot.innerHTML = `
        <style>
          .root {
            position: fixed;
            inset: 0;
            z-index: var(--z-index-dialog);
          }
        </style>
        <div class="root">
          <slot></slot>
        </div>
      `
    }

    // Remember the sheet content root within this subtree. If it doesn't
    // exist yet, fall back to the portal host itself.
    this._contentRoot = this.querySelector(UI_SHEET_CONTENT_TAG_NAME) as HTMLElement | null

    const isAlert = sheet.alert

    const inertRoot = (this._contentRoot ?? this) as HTMLElement

    this._dismissible = createDismissibleLayer({
      hostElement: inertRoot,
      onDismiss: () => {
        const sheetId = sheet.instanceId
        sheet.dispatchEvent(
          new CustomEvent(UI_SHEET_EVENTS.REQUEST_CLOSE, {
            bubbles: true,
            composed: true,
            detail: sheetId !== undefined ? ({ sheetId } satisfies { sheetId: string }) : undefined
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

    // Trap focus within the sheet content while the sheet is open.
    const trapContainer = (this._contentRoot ?? this) as HTMLElement
    this._focusTrap = createFocusTrap(trapContainer, {
      loop: true
    })
    this._focusTrap.activate()

    // Lock document scrolling while the sheet is open.
    this._releaseScrollLock = acquireScrollLock()

    // Animate sheet presence on the fixed container (.root) using opacity
    // only to avoid creating a containing block for fixed descendants.
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
      void this._animator.enter()
    } else {
      this._animator = null
    }
  }

  private async _teardownOpenState(): Promise<void> {
    // Play exit animation before cleaning up state.
    if (this._animator) {
      await this._animator.exit()
      this._animator.cancel()
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

if (!customElements.get(UI_SHEET_PORTAL_TAG_NAME)) {
  customElements.define(UI_SHEET_PORTAL_TAG_NAME, UiSheetPortal)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_PORTAL_TAG_NAME]: UiSheetPortal
  }
}
