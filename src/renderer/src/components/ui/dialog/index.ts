import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?raw'
import style from './style.css?inline'
import { UIButton } from '../button'
import xIcon from '@renderer/assets/icons/x.svg?raw'
export type UIRequestCloseDetail = {
  source: 'close-button' | 'keyboard' | 'overlay' | 'cancel'
}
export class UIDialog extends HTMLElement {
  private _baseEl: HTMLElement | null = null
  private _overlayEl: HTMLElement | null = null
  private _panelEl: HTMLElement | null = null
  private _footerEl: HTMLElement | null = null
  private _triggerSlot: HTMLSlotElement | null = null
  private _footerSlot: HTMLSlotElement | null = null
  private _cancelSlot: HTMLSlotElement | null = null
  private _aborters = new WeakMap<HTMLElement, AbortController>()
  private _closeBtn: UIButton | null = null
  private _originalTrigger: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return ['open', 'show-x-button', 'alert']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'show-x-button') this._syncCloseVisibility()
    if (name === 'open') {
      this._syncOpenState()
      this._onOpenChanged()
    }
  }

  connectedCallback(): void {
    this.render()
    this.applyListeners()

    this._onTriggerSlotChange()
    this._onCancelSlotChange()
    this._onFooterSlotChange()

    // Initial footer visibility sync
    this._syncFooterVisibility()

    // Ensure internal close button according to attribute/slot
    this._ensureInternalClose()

    this._syncOpenState()
    this._onOpenChanged()
  }

  disconnectedCallback(): void {
    // Cleanup bound listeners via AbortControllers
    const allSlots: (HTMLSlotElement | null)[] = [
      this._triggerSlot,
      this._cancelSlot,
      this._footerSlot
    ]
    for (const slot of allSlots) {
      const nodes = slot?.assignedElements({ flatten: true }) ?? []
      for (const n of nodes) {
        const ac = this._aborters.get(n as HTMLElement)
        ac?.abort()
        this._aborters.delete(n as HTMLElement)
      }
    }
    this._removeOpenListeners()
  }

  private _ensureInternalClose(): void {
    const closeBtn = this.shadowRoot?.querySelector('#close-btn') as UIButton | null
    if (!closeBtn) return
    closeBtn.innerHTML = xIcon
    if (!this._closeBtn) {
      closeBtn.addEventListener('click', () => this.requestClose('close-button'))
      this._closeBtn = closeBtn
    }
    this._syncCloseVisibility()
  }

  private _syncCloseVisibility(): void {
    const shouldShow = this.hasAttribute('show-x-button')
    if (this._closeBtn) {
      if (shouldShow) this._closeBtn.setAttribute('data-closable', '')
      else this._closeBtn.removeAttribute('data-closable')
    }
  }

  private applyListeners(): void {
    this._triggerSlot?.addEventListener('slotchange', () => this._onTriggerSlotChange())
    this._cancelSlot?.addEventListener('slotchange', () => this._onCancelSlotChange())
    this._footerSlot?.addEventListener('slotchange', () => this._onFooterSlotChange())
    // Overlay click requests close (cancelable)
    this._overlayEl?.addEventListener('click', () => {
      if (this.hasAttribute('alert')) return
      this.requestClose('overlay')
    })
  }

  private render(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const templateElement = tree.querySelector<HTMLTemplateElement>('template')
    if (!templateElement) return

    const content = templateElement.content.cloneNode(true)
    const styleElement = document.createElement('style')
    styleElement.textContent = resetStyle + style
    this.shadowRoot?.append(styleElement, content)

    this._baseEl = this.shadowRoot?.querySelector('[data-base]') as HTMLElement | null
    this._overlayEl = this.shadowRoot?.querySelector('[data-overlay]') as HTMLElement | null
    this._panelEl = this.shadowRoot?.querySelector('[data-panel]') as HTMLElement | null
    this._footerEl = this.shadowRoot?.querySelector('.footer') as HTMLElement | null
    this._triggerSlot = this.shadowRoot?.querySelector(
      'slot[name="trigger"]'
    ) as HTMLSlotElement | null
    this._footerSlot = this.shadowRoot?.querySelector(
      'slot[name="footer"]'
    ) as HTMLSlotElement | null
    this._cancelSlot = this.shadowRoot?.querySelector(
      'slot[name="cancel"]'
    ) as HTMLSlotElement | null
  }

  private _onTriggerSlotChange(): void {
    const nodes = this._triggerSlot?.assignedElements({ flatten: true }) ?? []
    if (nodes.length > 0) {
      const el = nodes[0] as HTMLElement
      this._bindOnce(el, () => this.openDialog())
    }
  }

  private _onCancelSlotChange(): void {
    const nodes = this._cancelSlot?.assignedElements({ flatten: true }) ?? []
    if (nodes.length > 0) {
      const el = nodes[0] as HTMLElement
      this._bindOnce(el, () => this.requestClose('cancel'))
    }
  }

  private _onFooterSlotChange(): void {
    const containers = this._footerSlot?.assignedElements({ flatten: true }) ?? []
    for (const c of containers) {
      const cancelButtons = (c as HTMLElement).querySelectorAll('[slot="cancel"]')
      cancelButtons.forEach((btn) =>
        this._bindOnce(btn as HTMLElement, () => this.requestClose('cancel'))
      )
    }
    this._syncFooterVisibility()
  }

  private _syncFooterVisibility(): void {
    const hasCancel = (this._cancelSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    const hasFooter = (this._footerSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    const hasAny = hasCancel || hasFooter
    if (this._footerEl) {
      if (hasAny) this._footerEl.setAttribute('data-has-footer', '')
      else this._footerEl.removeAttribute('data-has-footer')
    }
    this._baseEl?.classList.toggle('dialog--has-footer', hasAny)
  }

  private _bindOnce(el: HTMLElement, handler: () => void): void {
    const prev = this._aborters.get(el)
    prev?.abort()
    const ac = new AbortController()
    this._aborters.set(el, ac)
    el.addEventListener('click', handler, { signal: ac.signal })
  }

  private _syncOpenState(): void {
    const isOpen = this.open
    this.toggleAttribute('data-open', isOpen)
    this._overlayEl?.toggleAttribute('data-open', isOpen)
    this._panelEl?.toggleAttribute('data-open', isOpen)
    this._panelEl?.setAttribute('aria-hidden', isOpen ? 'false' : 'true')
    this._baseEl?.classList.toggle('dialog--open', isOpen)
  }

  private _onOpenChanged(): void {
    if (this.open) {
      this.dispatchEvent(new CustomEvent('ui-show', { bubbles: true }))
      this._addOpenListeners()
      this._originalTrigger = (document.activeElement as HTMLElement) || null
      this._lockBodyScroll()
      // Focus panel or first autofocus element
      requestAnimationFrame(() => {
        const autoFocusTarget = this.querySelector('[autofocus]') as HTMLElement | null
        if (autoFocusTarget) {
          autoFocusTarget.focus({ preventScroll: true })
        } else {
          const panel = this._panelEl as HTMLElement | null
          panel?.focus({ preventScroll: true })
        }
      })
      this.dispatchEvent(new CustomEvent('ui-after-show', { bubbles: true }))
    } else {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
      this.dispatchEvent(new CustomEvent('ui-hide', { bubbles: true }))
      this._removeOpenListeners()
      this._unlockBodyScroll()
      // Restore focus to trigger
      const t = this._originalTrigger
      if (t && typeof t.focus === 'function') setTimeout(() => t.focus())
      this.dispatchEvent(new CustomEvent('ui-after-hide', { bubbles: true }))
    }
  }

  private _addOpenListeners(): void {
    document.addEventListener('keydown', this._onKeydown)
  }

  private _removeOpenListeners(): void {
    document.removeEventListener('keydown', this._onKeydown)
  }

  private _onKeydown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape' && this.open) {
      if (this.hasAttribute('alert')) return
      ev.stopPropagation()
      this.requestClose('keyboard')
    }
  }

  private _lockBodyScroll(): void {
    document.body.style.overflow = 'hidden'
  }

  private _unlockBodyScroll(): void {
    document.body.style.overflow = ''
  }

  requestClose(source: 'close-button' | 'keyboard' | 'overlay' | 'cancel' = 'close-button'): void {
    const ev = new CustomEvent<UIRequestCloseDetail>('ui-request-close', {
      bubbles: true,
      cancelable: true,
      detail: { source }
    })
    const notPrevented = this.dispatchEvent(ev)
    if (notPrevented) this.close()
  }

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

  close(): void {
    this.open = false
  }
}

customElements.define('ui-dialog', UIDialog)

declare global {
  interface HTMLElementTagNameMap {
    'ui-dialog': UIDialog
  }
  interface HTMLElementEventMap {
    'ui-show': CustomEvent<void>
    'ui-after-show': CustomEvent<void>
    'ui-hide': CustomEvent<void>
    'ui-after-hide': CustomEvent<void>
    'ui-request-close': CustomEvent<import('./index').UIRequestCloseDetail>
  }
}
