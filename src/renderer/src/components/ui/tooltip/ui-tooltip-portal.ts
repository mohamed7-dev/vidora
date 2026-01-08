import { createPresenceAnimator, type PresenceAnimator } from '@renderer/lib/ui/animation'
import { acquireScrollLock, type ScrollLockRelease } from '@renderer/lib/ui/scroll-locking'
import { ensureTooltip, type UiTooltip } from './ui-tooltip'
import {
  OpenChangeEventDetail,
  UI_TOOLTIP_ATTRIBUTES,
  UI_TOOLTIP_CONTENT_TAG_NAME,
  UI_TOOLTIP_EVENTS,
  UI_TOOLTIP_PORTAL_TAG_NAME,
  UI_TOOLTIP_TRIGGER_TAG_NAME
} from './constants'
import { TooltipAlign, TooltipPositioner, TooltipSide } from './tooltip-positioner'

export class UiTooltipPortal extends HTMLElement {
  private _tooltip: UiTooltip | null = null
  private _contentRoot: HTMLElement | null = null
  private _animator: PresenceAnimator | null = null
  private _hoverCount = 0
  private _closeTimeoutId: number | null = null
  private _storedContent: DocumentFragment | null = null
  private _releaseScrollLock: ScrollLockRelease | null = null
  private _resizeHandler: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._findTooltip()
    this._setupListeners()
    this._init()
  }

  disconnectedCallback(): void {
    this._tooltip?.removeEventListener(
      UI_TOOLTIP_EVENTS.OPEN_CHANGE,
      this._onOpenChange as EventListener
    )
    this._tooltip = null
    void this._teardownPortal(true)
  }

  private _findTooltip(): UiTooltip | null {
    this._tooltip = ensureTooltip(this, UI_TOOLTIP_PORTAL_TAG_NAME) as UiTooltip | null
    return this._tooltip
  }

  private _setupListeners(): void {
    this._tooltip?.addEventListener(
      UI_TOOLTIP_EVENTS.OPEN_CHANGE,
      this._onOpenChange as EventListener
    )
  }

  private _init(): void {
    if (this._tooltip?.open) {
      this._mount()
    }
  }

  private _onOpenChange = (event: Event): void => {
    const custom = event as CustomEvent<OpenChangeEventDetail>
    if (!custom.detail) return

    if (custom.detail.open) {
      this._mount()
    } else {
      this._scheduleTeardown()
    }
  }

  private _mount(): void {
    if (!this.shadowRoot) return

    if (!this.shadowRoot.querySelector('slot')) {
      const slot = document.createElement('slot')
      this.shadowRoot.appendChild(slot)
    }

    const tooltip = this._findTooltip()
    if (!tooltip) return

    // If we previously unmounted the content into a fragment, restore it
    // before we query for the tooltip content element.
    if (this._storedContent && !this.hasChildNodes()) {
      this.appendChild(this._storedContent)
      this._storedContent = null
    }

    this._contentRoot = this.querySelector(UI_TOOLTIP_CONTENT_TAG_NAME) as HTMLElement | null

    const contentEl = (this._contentRoot ?? this) as HTMLElement

    const trigger = tooltip.querySelector(UI_TOOLTIP_TRIGGER_TAG_NAME)
    if (trigger instanceof HTMLElement) {
      const computeAndApplyPosition = (): void => {
        const offsetAttr =
          tooltip.getAttribute(UI_TOOLTIP_ATTRIBUTES.OFFSET) ?? this.getAttribute('offset')
        const offset = offsetAttr != null ? Number(offsetAttr) || 0 : 6
        const sideAttr =
          tooltip.getAttribute(UI_TOOLTIP_ATTRIBUTES.SIDE) ?? this.getAttribute('side') ?? 'top'
        const alignAttr =
          tooltip.getAttribute(UI_TOOLTIP_ATTRIBUTES.ALIGN) ??
          this.getAttribute('align') ??
          'center'

        TooltipPositioner.position({
          trigger,
          content: contentEl,
          side: sideAttr.toLowerCase() as TooltipSide,
          align: alignAttr.toLowerCase() as TooltipAlign,
          offset
        })
        contentEl.style.zIndex = 'var(--z-index-tooltip)'
      }

      // Initial positioning relative to the trigger, using the shared
      // dropdown positioner. Defer to the next animation frame and run
      // a second pass to account for late layout changes.
      requestAnimationFrame(() => {
        computeAndApplyPosition()
        requestAnimationFrame(() => {
          computeAndApplyPosition()
        })
      })

      // Recalculate position on window resize while the tooltip is open.
      if (!this._resizeHandler) {
        this._resizeHandler = () => {
          // If content has been unmounted, skip.
          if (!this._contentRoot || !this.isConnected) return
          computeAndApplyPosition()
        }
        window.addEventListener('resize', this._resizeHandler)
      }
    }

    // Lock document scrolling while the tooltip is open.
    if (!this._releaseScrollLock) {
      this._releaseScrollLock = acquireScrollLock()
    }

    const contentForAnimation = contentEl
    this._animator = createPresenceAnimator(
      contentForAnimation,
      [
        { opacity: 0, transform: 'translateY(2px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ],
      [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(2px) scale(0.98)' }
      ],
      {
        duration: 130,
        easing: 'ease-out'
      }
    )
    void this._animator.enter()

    const triggerEl = tooltip.querySelector(UI_TOOLTIP_TRIGGER_TAG_NAME) as HTMLElement | null

    const enter = (): void => this._incrementHover()
    const leave = (): void => this._decrementHover()

    this._contentRoot?.addEventListener('mouseenter', enter)
    this._contentRoot?.addEventListener('mouseleave', leave)
    triggerEl?.addEventListener('mouseenter', enter)
    triggerEl?.addEventListener('mouseleave', leave)
  }

  private _incrementHover(): void {
    this._hoverCount += 1
    if (this._closeTimeoutId !== null) {
      window.clearTimeout(this._closeTimeoutId)
      this._closeTimeoutId = null
    }
  }

  private _decrementHover(): void {
    this._hoverCount = Math.max(0, this._hoverCount - 1)
    if (this._hoverCount === 0) {
      this._scheduleTeardown()
    }
  }

  private _scheduleTeardown(): void {
    if (this._closeTimeoutId !== null) return
    this._closeTimeoutId = window.setTimeout(() => {
      void this._teardownPortal()
    }, 50)
  }

  private async _teardownPortal(forceImmediate = false): Promise<void> {
    if (!this._contentRoot) return

    if (!forceImmediate && this._animator) {
      await this._animator.exit()
      this._animator.cancel()
      this._animator = null
    }

    // Clear inline positioning styles so any future mount starts from a
    // clean slate.
    const style = this._contentRoot.style
    style.position = ''
    style.top = ''
    style.left = ''
    style.zIndex = ''
    style.transform = ''

    // Unmount light-DOM children by moving them into an internal fragment.
    const fragment = document.createDocumentFragment()
    while (this.firstChild) {
      fragment.appendChild(this.firstChild)
    }
    this._storedContent = fragment

    this._contentRoot = null

    // Release scroll lock and resize handler if we acquired/attached them.
    if (this._releaseScrollLock) {
      this._releaseScrollLock()
      this._releaseScrollLock = null
    }

    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler)
      this._resizeHandler = null
    }

    if (this._closeTimeoutId !== null) {
      window.clearTimeout(this._closeTimeoutId)
      this._closeTimeoutId = null
    }
  }
}

if (!customElements.get(UI_TOOLTIP_PORTAL_TAG_NAME)) {
  customElements.define(UI_TOOLTIP_PORTAL_TAG_NAME, UiTooltipPortal)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_TOOLTIP_PORTAL_TAG_NAME]: UiTooltipPortal
  }
}
