import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?raw'
import style from './style.css?inline'
import { UIButton } from '../button'

export class UDialog extends HTMLElement {
  private _overlayEl: HTMLElement | null = null
  private _panelEl: HTMLElement | null = null
  private _footerEl: HTMLElement | null = null
  private _triggerSlot: HTMLSlotElement | null = null
  private _footerSlot: HTMLSlotElement | null = null
  private _cancelSlot: HTMLSlotElement | null = null
  private _closeSlot: HTMLSlotElement | null = null
  private _aborters = new WeakMap<HTMLElement, AbortController>()
  private _closeBtn: UIButton | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return ['open', 'closable']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'closable') this._syncCloseVisibility()
    if (name === 'open') this._syncOpenState()
  }

  private _ensureInternalClose(): void {
    const closeBtn = this.shadowRoot?.querySelector('#close-btn') as UIButton | null

    if (!closeBtn) return
    if (!this._closeBtn) {
      closeBtn.addEventListener('click', () => this.close())
      this._closeBtn = closeBtn
    }
    this._syncCloseVisibility()
  }

  private _syncCloseVisibility(): void {
    const hasCustomClose = (this._closeSlot?.assignedElements({ flatten: true }) ?? []).length > 0
    const shouldShow = this.hasAttribute('closable') && !hasCustomClose
    if (this._closeBtn) this._closeBtn.hidden = !shouldShow
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const templateElement = tree.querySelector<HTMLTemplateElement>('template')
    if (!templateElement) return

    const content = templateElement.content.cloneNode(true)
    const styleElement = document.createElement('style')
    styleElement.textContent = resetStyle + style
    this.shadowRoot?.append(styleElement, content)

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
    this._closeSlot = this.shadowRoot?.querySelector('slot[name="close"]') as HTMLSlotElement | null

    // Non-dismissible: overlay click should do nothing
    // this._overlayEl?.addEventListener('click', () => this.close()) // disabled on purpose

    this._onTriggerSlotChange()
    this._triggerSlot?.addEventListener('slotchange', () => this._onTriggerSlotChange())

    this._onCancelSlotChange()
    this._cancelSlot?.addEventListener('slotchange', () => this._onCancelSlotChange())

    this._onCloseSlotChange()
    this._closeSlot?.addEventListener('slotchange', () => this._onCloseSlotChange())

    this._onFooterSlotChange()
    this._footerSlot?.addEventListener('slotchange', () => this._onFooterSlotChange())

    // Initial footer visibility sync
    this._syncFooterVisibility()

    // Ensure internal close button according to attribute/slot
    this._ensureInternalClose()

    // Non-dismissible: do not close on ESC for alert dialog
    // document.addEventListener('keydown', this._onKeydown)

    this._syncOpenState()
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
      this._bindOnce(el, () => this.close())
    }
    this._syncFooterVisibility()
  }

  private _onCloseSlotChange(): void {
    const nodes = this._closeSlot?.assignedElements({ flatten: true }) ?? []
    if (nodes.length > 0) {
      const el = nodes[0] as HTMLElement
      this._bindOnce(el, () => this.close())
    }
    // If a custom close is provided, hide internal button to avoid duplication
    this._syncCloseVisibility()
  }

  private _onFooterSlotChange(): void {
    const containers = this._footerSlot?.assignedElements({ flatten: true }) ?? []
    for (const c of containers) {
      const cancelButtons = (c as HTMLElement).querySelectorAll('[slot="cancel"]')
      cancelButtons.forEach((btn) => this._bindOnce(btn as HTMLElement, () => this.close()))
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

customElements.define('ui-dialog', UDialog)
