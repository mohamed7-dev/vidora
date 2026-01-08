import { createDismissibleLayer, type DismissibleLayer } from '@renderer/lib/ui/dismissable-layer'
import { createFocusTrap, type FocusTrapHandle } from '@renderer/lib/ui/focus-trap'
import { createPresenceAnimator, type PresenceAnimator } from '@renderer/lib/ui/animation'
import { ensureSelect, type UiSelect } from './ui-select'
import { acquireScrollLock, type ScrollLockRelease } from '@renderer/lib/ui/scroll-locking'
import { positionSelectMenu } from './select-positioner'
import {
  CloseEventDetail,
  OpenChangeEventDetail,
  UI_SELECT_CONTENT_TAG_NAME,
  UI_SELECT_EVENTS,
  UI_SELECT_PORTAL_TAG_NAME,
  UI_SELECT_TRIGGER_TAG_NAME
} from './constants'

export class UiSelectPortal extends HTMLElement {
  private _dismissible: DismissibleLayer | null = null
  private _select: UiSelect | null = null
  private _focusTrap: FocusTrapHandle | null = null
  private _animator: PresenceAnimator | null = null
  private _contentRoot: HTMLElement | null = null
  private _boundResizeListener: (() => void) | null = null
  private _releaseScrollLock: ScrollLockRelease | null = null
  private _scrollOverlay: HTMLDivElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._findSelect()
    this._setupListeners()
    this._init()
  }

  disconnectedCallback(): void {
    this._select?.removeEventListener(
      UI_SELECT_EVENTS.OPEN_CHANGE,
      this._onOpenChange as EventListener
    )
    this._select = null
    void this._teardownOpenState()
  }

  private _findSelect(): UiSelect | null {
    this._select = ensureSelect(this, UI_SELECT_PORTAL_TAG_NAME) as UiSelect | null
    return this._select
  }

  private _setupListeners(): void {
    this._select?.addEventListener(
      UI_SELECT_EVENTS.OPEN_CHANGE,
      this._onOpenChange as EventListener
    )
  }

  private _init(): void {
    if (this._select?.open) {
      this._onOpened()
    }
  }

  private _onOpenChange = (event: Event): void => {
    const custom = event as CustomEvent<OpenChangeEventDetail>
    if (!custom.detail) return

    if (custom.detail.open) {
      this._onOpened()
    } else {
      this._teardownOpenState()
    }
  }

  private _onOpened(): void {
    if (this._dismissible) return

    const select = this._findSelect()
    if (!select) return

    // Ensure a slot exists so that light DOM children render in place.
    if (this.shadowRoot && !this.shadowRoot.querySelector('slot')) {
      const slot = document.createElement('slot')
      this.shadowRoot.appendChild(slot)
    }

    this._contentRoot = this.querySelector(UI_SELECT_CONTENT_TAG_NAME) as HTMLElement | null

    this._dismissible = createDismissibleLayer({
      hostElement: this,
      onDismiss: () => {
        const selectId = select.instanceId
        select.dispatchEvent(
          new CustomEvent(UI_SELECT_EVENTS.REQUEST_CLOSE, {
            bubbles: true,
            composed: true,
            detail: selectId !== undefined ? ({ selectId } satisfies CloseEventDetail) : undefined
          })
        )
      },
      dismissOnEscape: true,
      dismissOnPointerDownOutside: true,
      isInside: (_event: PointerEvent, path: EventTarget[]) => {
        const triggerEl = this._select?.querySelector(
          UI_SELECT_TRIGGER_TAG_NAME
        ) as HTMLElement | null
        // Treat pointer events on the trigger or inside the content
        // root as "inside" the layer.
        if (triggerEl && path.includes(triggerEl)) return true
        if (!this._contentRoot) return true
        return path.includes(this._contentRoot)
      }
    })

    // Initial positioning relative to the trigger. Defer to the next
    // animation frame so that the menu has been laid out and measured
    // correctly on the very first open. Run a second pass on the
    // following frame to account for late layout changes (e.g. font
    // loading) that can affect width, which is especially noticeable
    // for center alignment.
    requestAnimationFrame(() => {
      if (!this._dismissible) return
      this._updatePosition()
      requestAnimationFrame(() => {
        if (!this._dismissible) return
        this._updatePosition()
      })
    })

    // Lock document scrolling while the select is open.
    this._releaseScrollLock = acquireScrollLock()

    // Create a transparent overlay inside the portal that covers the
    // viewport. This prevents wheel/scroll events from reaching
    // underlying scroll containers (e.g. dialog content) while the
    // select menu is open.
    if (!this._scrollOverlay) {
      this._scrollOverlay = this._createOverlay()
    }

    // Recalculate position on window resize while open.
    this._boundResizeListener = () => {
      if (!this._dismissible) return
      this._updatePosition()
    }
    window.addEventListener('resize', this._boundResizeListener)

    // Trap focus within the select content while it is open. Initial
    // focus will go to the first focusable element (typically the
    // first option) inside the content.
    const trapContainer = (this._contentRoot ?? this) as HTMLElement
    this._focusTrap = createFocusTrap(trapContainer, {
      loop: true,
      restoreFocus: this._select?.querySelector(UI_SELECT_TRIGGER_TAG_NAME) as HTMLElement | null
    })
    this._focusTrap.activate()

    // Animate select presence.
    const contentForAnimation = (this._contentRoot ?? this) as HTMLElement
    this._animator = createPresenceAnimator(
      contentForAnimation,
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(4px)' }
      ],
      {
        duration: 150,
        easing: 'ease-out'
      }
    )
    void this._animator.enter()
  }

  private async _teardownOpenState(): Promise<void> {
    // Play exit animation before tearing down state.
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

    this._contentRoot = null

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = ''
    }

    if (this._boundResizeListener) {
      window.removeEventListener('resize', this._boundResizeListener)
      this._boundResizeListener = null
    }

    if (this._releaseScrollLock) {
      this._releaseScrollLock()
      this._releaseScrollLock = null
    }

    if (this._scrollOverlay && this._scrollOverlay.parentNode) {
      this._scrollOverlay.parentNode.removeChild(this._scrollOverlay)
    }
    this._scrollOverlay = null
  }

  private _updatePosition(): void {
    const select = this._select ?? this._findSelect()
    if (!select) return

    const trigger = select.querySelector(UI_SELECT_TRIGGER_TAG_NAME)
    const positioned = (this._contentRoot ?? this) as HTMLElement

    if (trigger instanceof HTMLElement) {
      const offsetAttr = this.getAttribute('offset')
      const offset = offsetAttr != null ? Number(offsetAttr) || 0 : 4
      const alignAttr = (this.getAttribute('align') ?? 'start').toLowerCase()
      const align = alignAttr === 'center' || alignAttr === 'end' ? alignAttr : 'start'
      positioned.style.zIndex = 'var(--z-index-dropdown)'
      positionSelectMenu({
        trigger,
        menu: positioned,
        align,
        offset
      })
    }
  }

  private _createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.background = 'transparent'
    overlay.style.zIndex = 'calc(var(--z-index-dropdown) - 1)'
    overlay.style.pointerEvents = 'auto'
    // Intercept wheel events so underlying scroll containers do not
    // scroll while the menu is open.
    overlay.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault()
      },
      { passive: false }
    )

    // Ensure the overlay sits behind the positioned menu content in
    // the DOM order.
    if (this.firstChild) {
      this.insertBefore(overlay, this.firstChild)
    } else {
      this.appendChild(overlay)
    }

    return overlay
  }
}

if (!customElements.get(UI_SELECT_PORTAL_TAG_NAME)) {
  customElements.define(UI_SELECT_PORTAL_TAG_NAME, UiSelectPortal)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SELECT_PORTAL_TAG_NAME]: UiSelectPortal
  }
}
