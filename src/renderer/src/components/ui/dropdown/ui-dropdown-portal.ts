import { createDismissibleLayer, type DismissibleLayer } from '@renderer/lib/ui/dismissable-layer'
import { createFocusTrap, type FocusTrapHandle } from '@renderer/lib/ui/focus-trap'
import { createPresenceAnimator, type PresenceAnimator } from '@renderer/lib/ui/animation'
import { acquireScrollLock, type ScrollLockRelease } from '@renderer/lib/ui/scroll-locking'
import { positionDropdownMenu } from './dropdown-positioner'
import { ensureDropdown, type UiDropdown } from './ui-dropdown'
import {
  CloseEventDetail,
  UI_DROPDOWN_CONTENT_TAG_NAME,
  UI_DROPDOWN_EVENTS,
  UI_DROPDOWN_PORTAL_TAG_NAME,
  UI_DROPDOWN_TRIGGER_TAG_NAME
} from './constants'

export class UiDropdownPortal extends HTMLElement {
  private _dismissible: DismissibleLayer | null = null
  private _dropdown: UiDropdown | null = null
  private _focusTrap: FocusTrapHandle | null = null
  private _animator: PresenceAnimator | null = null
  private _contentRoot: HTMLElement | null = null
  private _releaseScrollLock: ScrollLockRelease | null = null
  private _boundResizeListener: (() => void) | null = null
  private _scrollOverlay: HTMLDivElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._findDropdown()
    this._setupListeners()
    this._init()
  }

  disconnectedCallback(): void {
    this._dropdown?.removeEventListener(
      UI_DROPDOWN_EVENTS.OPEN_CHANGE,
      this._onOpenChange as EventListener
    )
    this._dropdown = null
    void this._teardown()
  }

  private _findDropdown(): UiDropdown | null {
    this._dropdown = ensureDropdown(this, UI_DROPDOWN_PORTAL_TAG_NAME) as UiDropdown | null
    return this._dropdown
  }

  private _setupListeners(): void {
    this._dropdown?.addEventListener(
      UI_DROPDOWN_EVENTS.OPEN_CHANGE,
      this._onOpenChange as EventListener
    )
  }

  private _init(): void {
    if (this._dropdown?.open) {
      this._mount()
    }
  }

  private _onOpenChange = (event: Event): void => {
    const custom = event as CustomEvent<{ open: boolean }>
    if (!custom.detail) return

    if (custom.detail.open) {
      this._mount()
    } else {
      this._teardown()
    }
  }

  private _mount(): void {
    // Ensure a slot exists so that light DOM children render in place.
    if (this.shadowRoot && !this.shadowRoot.querySelector('slot')) {
      const slot = document.createElement('slot')
      this.shadowRoot.appendChild(slot)
    }
    if (this._dismissible) return

    const dropdown = this._findDropdown()
    if (!dropdown) return

    this._contentRoot = this.querySelector(UI_DROPDOWN_CONTENT_TAG_NAME) as HTMLElement | null

    this._dismissible = createDismissibleLayer({
      hostElement: this,
      onDismiss: () => {
        dropdown.dispatchEvent(
          new CustomEvent(UI_DROPDOWN_EVENTS.REQUEST_CLOSE, {
            bubbles: true,
            composed: true,
            detail: { menuId: dropdown.instanceId } satisfies CloseEventDetail
          })
        )
      },
      dismissOnEscape: true,
      dismissOnPointerDownOutside: true,
      isInside: (_event, path) => {
        const triggerEl = this._dropdown?.querySelector(
          UI_DROPDOWN_TRIGGER_TAG_NAME
        ) as HTMLElement | null

        if (triggerEl && path.includes(triggerEl)) return true
        if (!this._contentRoot) return true
        return path.includes(this._contentRoot)
      }
    })

    if (!this._dismissible) return

    // Initial positioning relative to the trigger, using the shared
    // dropdown positioner. Defer to the next animation frame and run
    // a second pass to account for late layout changes.
    requestAnimationFrame(() => {
      if (!this._dismissible) return
      this._updatePosition()
      requestAnimationFrame(() => {
        if (!this._dismissible) return
        this._updatePosition()
      })
    })

    // Lock document scrolling while the dropdown is open.
    this._releaseScrollLock = acquireScrollLock()

    // Create a transparent overlay inside the portal that covers the
    // viewport and intercepts wheel events, so underlying scroll
    // containers do not scroll while the menu is open.
    if (!this._scrollOverlay) {
      this._scrollOverlay = this._createOverlay()
    }

    // Recalculate position on window resize while open.
    this._boundResizeListener = () => {
      if (!this._dismissible) return
      this._updatePosition()
    }
    window.addEventListener('resize', this._boundResizeListener)

    const trapContainer = (this._contentRoot ?? this) as HTMLElement
    this._focusTrap = createFocusTrap(trapContainer, { loop: true })
    this._focusTrap.activate()

    const contentForAnimation = (this._contentRoot ?? this) as HTMLElement
    this._animator = createPresenceAnimator(
      contentForAnimation,
      [
        { opacity: 0, transform: 'translateY(4px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ],
      [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(4px) scale(0.98)' }
      ],
      {
        duration: 150,
        easing: 'ease-out'
      }
    )
    void this._animator.enter()
  }

  private async _teardown(): Promise<void> {
    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = ''
    }

    if (this._animator) {
      await this._animator.exit()
      this._animator.cancel()
      this._animator = null
    }

    if (this._focusTrap) {
      this._focusTrap.destroy()
      this._focusTrap = null
    }
    this._contentRoot = null

    if (this._dismissible) {
      this._dismissible.destroy()
      this._dismissible = null
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
    const dropdown = this._dropdown ?? this._findDropdown()
    if (!dropdown) return

    const trigger = dropdown.querySelector(UI_DROPDOWN_TRIGGER_TAG_NAME)
    const positioned = (this._contentRoot ?? this) as HTMLElement

    if (trigger instanceof HTMLElement) {
      const offsetAttr = this.getAttribute('offset')
      const offset = offsetAttr != null ? Number(offsetAttr) || 0 : 4
      const alignAttr = (this.getAttribute('align') ?? 'start').toLowerCase()
      const align = alignAttr === 'center' || alignAttr === 'end' ? alignAttr : 'start'

      positioned.style.zIndex = 'var(--z-index-dropdown)'
      positionDropdownMenu({
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

    overlay.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault()
      },
      { passive: false }
    )

    if (this.firstChild) {
      this.insertBefore(overlay, this.firstChild)
    } else {
      this.appendChild(overlay)
    }

    return overlay
  }
}

if (!customElements.get(UI_DROPDOWN_PORTAL_TAG_NAME)) {
  customElements.define(UI_DROPDOWN_PORTAL_TAG_NAME, UiDropdownPortal)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DROPDOWN_PORTAL_TAG_NAME]: UiDropdownPortal
  }
}
