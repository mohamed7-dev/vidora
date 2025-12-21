import template from './template.html?raw'
import style from './style.css?inline'
import { UIButton } from '../button'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../lib/template-loader'
import type { PresenceAnimator } from '../lib/animation'
import { createPresenceAnimator } from '../lib/animation'
import type { FocusTrapHandle } from '../lib/focus-scope/focus-trap'
import { createFocusTrap } from '../lib/focus-scope/focus-trap'
import type { DismissableLayerHandle } from '../lib/dismissable-layer'
import { createDismissableLayer } from '../lib/dismissable-layer'
import type { ScrollLockHandle } from '../lib/scroll-lock'
import { createScrollLock } from '../lib/scroll-lock'
import {
  bindSlotAssignedDescendantClicks,
  bindSlotFirstAssignedClick,
  type Cleanup
} from '../lib/slot-utils'

type Source = 'close-button' | 'keyboard' | 'overlay' | 'cancel'

export type UIRequestCloseDetail = {
  source: Source
}
const DIALOG_NAME = 'ui-dialog'
const ATTRIBUTES = {
  OPEN: 'open',
  SHOW_X_BUTTON: 'show-x-button',
  ALERT: 'alert'
}

export class UIDialog extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(template)
  // states
  private _dialogMounted = false
  private _openCleanups: Array<() => void> = []
  private _slotCleanups: Cleanup[] = []
  private _focusTrap: FocusTrapHandle | null = null
  private _scrollLock: ScrollLockHandle | null = null
  private _dismissableLayer: DismissableLayerHandle | null = null
  private _originalTriggerTabIndex: string | null = null
  private _overlayAnimator: PresenceAnimator | null = null
  private _panelAnimator: PresenceAnimator | null = null
  private _isClosing = false
  // refs
  private _baseEl: HTMLElement | null = null
  private _overlayEl: HTMLElement | null = null
  private _panelEl: HTMLElement | null = null
  private _footerEl: HTMLElement | null = null
  private _triggerSlot: HTMLSlotElement | null = null
  private _footerSlot: HTMLSlotElement | null = null
  private _cancelSlot: HTMLSlotElement | null = null
  private _originalTrigger: HTMLElement | null = null
  private _xBtn: UIButton | null = null

  private _onXClick = (): void => {
    this.requestClose('close-button')
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
  }

  attributeChangedCallback(name: string): void {
    if (name === ATTRIBUTES.SHOW_X_BUTTON) this._syncXButtonVisibility()
    if (name === ATTRIBUTES.OPEN) {
      this._syncOpenState()
      this._onOpenChanged()
    }
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._applyListeners()

    this._syncOpenState()
    this._onOpenChanged()
  }

  disconnectedCallback(): void {
    this._runOpenCleanups()
    for (const c of this._slotCleanups) c()
    this._slotCleanups = []
  }

  // -----------------------------------------Sync States----------------------------------

  private _syncFooterVisibility(): void {
    const hasCancel = (this._cancelSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    const hasFooter = (this._footerSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    const hasAny = hasCancel || hasFooter
    if (this._footerEl) {
      if (hasAny) this._footerEl.setAttribute('data-has-footer', '')
      else this._footerEl.removeAttribute('data-has-footer')
    }
  }

  private _syncOpenState(): void {
    const isOpen = this.open
    this.toggleAttribute('data-open', isOpen)
    this._overlayEl?.toggleAttribute('data-open', isOpen)
    this._panelEl?.toggleAttribute('data-open', isOpen)
    this._panelEl?.setAttribute('aria-hidden', isOpen ? 'false' : 'true')
    this._baseEl?.toggleAttribute('data-open', isOpen)
  }

  private _syncXButtonVisibility(): void {
    const shouldShow = this.hasAttribute(ATTRIBUTES.SHOW_X_BUTTON)
    if (this._xBtn) {
      if (shouldShow) this._xBtn.setAttribute('data-show-x', '')
      else this._xBtn.removeAttribute('data-show-x')
    }
  }

  //---------------------------------Mounting/UnMounting------------------------
  private _applyListeners(): void {
    for (const c of this._slotCleanups) c()
    this._slotCleanups = []

    // X Close Button
    this._xBtn?.addEventListener('click', this._onXClick)
    if (this._xBtn) {
      this._slotCleanups.push(() => this._xBtn?.removeEventListener('click', this._onXClick))
    }

    // Trigger
    this._slotCleanups.push(
      bindSlotFirstAssignedClick(this._triggerSlot, () => {
        this.openDialog()
      })
    )

    // Cancel slot
    this._slotCleanups.push(
      bindSlotFirstAssignedClick(this._cancelSlot, () => {
        this.requestClose('cancel')
      })
    )

    // Footer cancel buttons inside the footer slot container(s)
    this._slotCleanups.push(
      bindSlotAssignedDescendantClicks(this._footerSlot, '[slot="cancel"]', () => {
        this.requestClose('cancel')
      })
    )

    // Footer visibility still depends on slot assignment.
    const updateFooter = (): void => {
      this._syncFooterVisibility()
    }
    if (this._footerSlot) {
      this._slotCleanups.push(() =>
        this._footerSlot?.removeEventListener('slotchange', updateFooter)
      )
    }
    if (this._cancelSlot) {
      this._slotCleanups.push(() =>
        this._cancelSlot?.removeEventListener('slotchange', updateFooter)
      )
    }
    this._footerSlot?.addEventListener('slotchange', updateFooter)
    this._cancelSlot?.addEventListener('slotchange', updateFooter)
    updateFooter()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UIDialog.sheet]
    const triggerSlot = document.createElement('slot')
    triggerSlot.name = 'trigger'
    this.shadowRoot.append(triggerSlot)
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._baseEl = this.shadowRoot.querySelector('[data-el="base"]') as HTMLElement
    this._overlayEl = this.shadowRoot.querySelector('[data-el="overlay"]') as HTMLElement
    this._panelEl = this.shadowRoot.querySelector('[data-el="panel"]') as HTMLElement
    this._footerEl = this.shadowRoot.querySelector('[data-el="footer"]') as HTMLElement
    this._triggerSlot = this.shadowRoot.querySelector('slot[name="trigger"]') as HTMLSlotElement
    this._footerSlot = this.shadowRoot.querySelector('slot[name="footer"]') as HTMLSlotElement
    this._cancelSlot = this.shadowRoot.querySelector('slot[name="cancel"]') as HTMLSlotElement
    this._xBtn = this.shadowRoot.querySelector('[data-el="x-btn"]') as UIButton
  }

  private _onOpenChanged(): void {
    if (this.open) {
      // Ensure we don't keep previous open-session resources.
      this._runOpenCleanups()
      this._mountDialog()
      this._onDialogMounted()
    } else {
      this._onDialogUnMount()
      this._unmountDialog()
    }
  }

  private _mountDialog(): void {
    if (this._dialogMounted || !this.shadowRoot) return
    const frag = UIDialog.tpl.content.cloneNode(true) as DocumentFragment
    const base = frag.querySelector('[data-el="base"]') as HTMLElement | null
    if (base) {
      const firstChild = this.shadowRoot.firstChild
      if (firstChild) this.shadowRoot.insertBefore(base, firstChild)
      else this.shadowRoot.append(base)
    }

    this._queryRefs()
    this._applyListeners()
    this._syncFooterVisibility()
    this._syncOpenState()
    this._syncXButtonVisibility()

    this._dialogMounted = true
  }

  private _onDialogMounted(): void {
    this.dispatchEvent(new CustomEvent('ui-show', { bubbles: true }))
    this._originalTrigger = (document.activeElement as HTMLElement) || null
    if (this._originalTrigger) {
      this._originalTriggerTabIndex = this._originalTrigger.getAttribute('tabindex')
      this._originalTrigger.setAttribute('tabindex', '-1')

      this._addOpenCleanup(() => {
        const t = this._originalTrigger
        if (!t) return
        if (this._originalTriggerTabIndex === null) t.removeAttribute('tabindex')
        else t.setAttribute('tabindex', this._originalTriggerTabIndex)
        this._originalTriggerTabIndex = null
      })
    }

    this._scrollLock?.destroy()
    this._scrollLock = createScrollLock(document.body)
    this._scrollLock.lock()
    this._addOpenCleanup(() => {
      this._scrollLock?.destroy()
      this._scrollLock = null
    })

    this._dismissableLayer?.destroy()
    this._dismissableLayer = createDismissableLayer(this._overlayEl, {
      onDismiss: (source) => {
        this.requestClose(source)
      },
      closeOnEscape: true,
      closeOnOverlayClick: true,
      isDismissable: () => !this.hasAttribute('alert')
    })
    this._dismissableLayer.activate()
    this._addOpenCleanup(() => {
      this._dismissableLayer?.destroy()
      this._dismissableLayer = null
    })

    // Animations
    this._overlayAnimator?.cancel()
    this._panelAnimator?.cancel()
    this._overlayAnimator = createPresenceAnimator(
      this._overlayEl,
      [{ opacity: 0 }, { opacity: 1 }],
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 180, easing: 'ease-out', fill: 'forwards' }
    )
    this._panelAnimator = createPresenceAnimator(
      this._panelEl,
      [
        { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ],
      [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(8px) scale(0.98)' }
      ],
      { duration: 180, easing: 'ease-out', fill: 'forwards' }
    )
    this._addOpenCleanup(() => {
      this._overlayAnimator?.cancel()
      this._panelAnimator?.cancel()
      this._overlayAnimator = null
      this._panelAnimator = null
    })

    // Activate focus trap (simple/non-nestable).
    if (this._panelEl) {
      this._focusTrap?.destroy()
      this._focusTrap = createFocusTrap(this._panelEl, {
        loop: true,
        initialFocus: () => this._getDialogAutofocusTarget(),
        restoreFocus: () => this._originalTrigger
      })
      requestAnimationFrame(() => this._focusTrap?.activate())
      this._addOpenCleanup(() => {
        this._focusTrap?.destroy()
        this._focusTrap = null
      })
    }
    void Promise.all([this._overlayAnimator.enter(), this._panelAnimator.enter()]).then(() => {
      this.dispatchEvent(new CustomEvent('ui-after-show', { bubbles: true }))
    })
  }

  private _unmountDialog(): void {
    if (!this._dialogMounted || !this.shadowRoot) return
    this._baseEl?.remove()
    this._baseEl = null
    this._overlayEl = null
    this._panelEl = null
    this._footerEl = null
    this._footerSlot = null
    this._cancelSlot = null
    this._xBtn = null
    this._dialogMounted = false
  }

  private _onDialogUnMount(): void {
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    this.dispatchEvent(new CustomEvent('ui-hide', { bubbles: true }))

    // Teardown open-session resources (also restores trigger tabindex).
    this._runOpenCleanups()

    // Restore focus to trigger (focus trap also attempts this, but keep it explicit for safety).
    const t = this._originalTrigger
    if (t && typeof t.focus === 'function') setTimeout(() => t.focus())
    this.dispatchEvent(new CustomEvent('ui-after-hide', { bubbles: true }))
  }

  // -------------------------UTILS----------------------
  requestClose(source: Source = 'close-button'): void {
    const ev = new CustomEvent<UIRequestCloseDetail>('ui-request-close', {
      bubbles: true,
      cancelable: true,
      detail: { source }
    })
    const notPrevented = this.dispatchEvent(ev)
    if (notPrevented) this.closeDialog()
  }

  private _addOpenCleanup(fn: () => void): void {
    this._openCleanups.push(fn)
  }

  private _runOpenCleanups(): void {
    const fns = this._openCleanups
    this._openCleanups = []
    for (const fn of fns.reverse()) {
      try {
        fn()
      } catch {
        // ignore
      }
    }
  }

  private _getDialogAutofocusTarget(): HTMLElement | null {
    const roots = this._getDialogContentRoots()
    for (const r of roots) {
      const t = r.querySelector?.('[autofocus]') as HTMLElement | null
      if (t) return t
    }
    return (this._panelEl?.querySelector?.('[autofocus]') as HTMLElement | null) || null
  }

  private _getDialogContentRoots(): HTMLElement[] {
    const slots = [
      this.shadowRoot?.querySelector('slot[name="header"]') as HTMLSlotElement | null,
      this.shadowRoot?.querySelector('slot[name="content"]') as HTMLSlotElement | null,
      this._cancelSlot,
      this._footerSlot
    ]

    const roots: HTMLElement[] = []
    for (const s of slots) {
      const assigned = s?.assignedElements({ flatten: true }) ?? []
      for (const el of assigned) roots.push(el as HTMLElement)
    }
    return roots
  }

  // -------------------------PUBLIC API--------------------
  get open(): boolean {
    return this.hasAttribute('open')
  }

  set open(value: boolean) {
    if (value) this.setAttribute('open', '')
    else this.removeAttribute('open')
  }

  openDialog(): void {
    this.open = true
  }

  closeDialog(): void {
    if (!this.open) return
    if (this._isClosing) return
    this._isClosing = true

    const finish = (): void => {
      this._isClosing = false
      this.open = false
    }

    // Play exit animation before removing the `open` attribute, otherwise CSS will hide elements.
    void Promise.all([
      this._overlayAnimator?.exit?.() ?? Promise.resolve(),
      this._panelAnimator?.exit?.() ?? Promise.resolve()
    ])
      .then(finish)
      .catch(finish)
  }
}

if (!customElements.get(DIALOG_NAME)) customElements.define(DIALOG_NAME, UIDialog)

declare global {
  interface HTMLElementTagNameMap {
    [DIALOG_NAME]: UIDialog
  }
  interface HTMLElementEventMap {
    'ui-show': CustomEvent<void>
    'ui-after-show': CustomEvent<void>
    'ui-hide': CustomEvent<void>
    'ui-after-hide': CustomEvent<void>
    'ui-request-close': CustomEvent<UIRequestCloseDetail>
  }
}
