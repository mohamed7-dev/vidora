import template from './template.html?raw'
import style from './style.css?inline'

type Source = 'keyboard' | 'overlay'

export type UIRequestCloseDetail = {
  source: Source
}

export class UIDropdown extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(style)
    return s
  })()
  private static readonly tpl: HTMLTemplateElement = (() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    const inner = doc.querySelector('template')
    const t = document.createElement('template')
    t.innerHTML = inner ? inner.innerHTML : template
    return t
  })()
  // refs
  private _panelEl: HTMLElement | null = null
  private _arrowEl: HTMLElement | null = null
  private _triggerSlot: HTMLSlotElement | null = null
  private _contentSlot: HTMLSlotElement | null = null
  private _menuSlot: HTMLSlotElement | null = null
  private _originalTrigger: HTMLElement | null = null

  // states
  private _aborters = new WeakMap<HTMLElement, AbortController>()
  private _dialogMounted = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return ['open', 'align']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'open') {
      this._syncOpenState()
      this._onOpenChanged()
    } else if (name === 'align') {
      this._syncAlignState()
    }
  }

  connectedCallback(): void {
    this._renderShell()
    this._queryRefs()
    this._applyListeners()

    this._onTriggerSlotChange()

    this._syncOpenState()
    this._onOpenChanged()
    this._syncAlignState()
  }

  disconnectedCallback(): void {
    this._cleanup()
  }

  private _renderShell(): void {
    // only render trigger by default
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UIDropdown.sheet]
    const triggerSlot = document.createElement('slot')
    triggerSlot.setAttribute('name', 'trigger')
    this.shadowRoot.append(triggerSlot)
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._panelEl = this.shadowRoot.querySelector('[data-el="panel"]') as HTMLElement
    this._arrowEl = this.shadowRoot.querySelector('[data-el="arrow"]') as HTMLElement
    this._triggerSlot = this.shadowRoot.querySelector('slot[name="trigger"]') as HTMLSlotElement
    this._contentSlot = this.shadowRoot.querySelector('slot[name="content"]') as HTMLSlotElement
    this._menuSlot = this.shadowRoot.querySelector('slot[name="menu-item"]') as HTMLSlotElement
  }

  private _applyListeners(): void {
    this._triggerSlot?.addEventListener('slotchange', () => this._onTriggerSlotChange())
    this._contentSlot?.addEventListener('slotchange', () => this._onContentSlotChange())
    this._menuSlot?.addEventListener('slotchange', () => this._onMenuSlotChange())
    document.addEventListener('keydown', this._onKeydown)
  }

  private _onTriggerSlotChange(): void {
    const nodes = this._triggerSlot?.assignedElements({ flatten: true }) ?? []
    if (nodes.length > 0) {
      const el = nodes[0] as HTMLElement
      this._bindTrigger(el)
    }
  }

  private _onContentSlotChange(): void {
    const containers = this._contentSlot?.assignedElements({ flatten: true }) ?? []
    for (const c of containers) {
      const menuItems = (c as HTMLElement).querySelectorAll('[slot="menu-item"]')
      menuItems.forEach((item) => this._bindMenuItem(item as HTMLElement))
    }
  }

  private _onMenuSlotChange(): void {
    const items = this._menuSlot?.assignedElements({ flatten: true }) ?? []
    for (const it of items) {
      this._bindMenuItem(it as HTMLElement)
    }
  }

  private _bindTrigger(el: HTMLElement): void {
    const prev = this._aborters.get(el)
    prev?.abort()
    const ac = new AbortController()
    this._aborters.set(el, ac)
    el.addEventListener(
      'click',
      (ev) => {
        ev.stopPropagation()
        this.toggle()
        if (this.open) this._positionPanelRelativeTo(el)
      },
      { signal: ac.signal }
    )
  }

  private _bindMenuItem(el: HTMLElement): void {
    const prev = this._aborters.get(el)
    prev?.abort()
    const ac = new AbortController()
    this._aborters.set(el, ac)
    el.addEventListener(
      'click',
      () => {
        this.close()
      },
      { signal: ac.signal }
    )
  }

  private _positionPanelRelativeTo(triggerEl: HTMLElement): void {
    if (!this._panelEl) return
    const rect = triggerEl.getBoundingClientRect()
    const panel = this._panelEl
    // basic placement: bottom-start relative to viewport
    panel.style.position = 'fixed'
    panel.style.top = `${Math.round(rect.bottom + 6)}px`
    const vw = window.innerWidth
    const margin = 8
    const panelWidth = panel.getBoundingClientRect().width || 200

    let left: number
    const align = this.align
    if (align === 'center') {
      left = rect.left + Math.round((rect.width - panelWidth) / 2)
    } else if (align === 'end') {
      left = rect.right - panelWidth
    } else {
      // 'start'
      left = rect.left
    }
    // Clamp within viewport margins
    left = Math.min(Math.max(left, margin), vw - panelWidth - margin)
    panel.style.left = `${left}px`

    // Position arrow under trigger center, clamped within panel bounds
    if (this._arrowEl) {
      const panelLeft = left
      const triggerCenter = rect.left + rect.width / 2
      const rawArrowLeft = triggerCenter - panelLeft
      const arrowHalf = 6 // half of arrow width (~12px)
      const clamped = Math.min(Math.max(rawArrowLeft, arrowHalf + 6), panelWidth - (arrowHalf + 6))
      this._arrowEl.style.left = `${Math.round(clamped)}px`
    }
  }

  private _handleOutside = (ev: MouseEvent): void => {
    if (!this.open) return
    const path = ev.composedPath()
    const triggerNodes = this._triggerSlot?.assignedElements({ flatten: true }) ?? []
    const isInsidePanel = !!this._panelEl && path.includes(this._panelEl)
    const isInsideTrigger = triggerNodes.some((n) => path.includes(n))
    if (!isInsidePanel && !isInsideTrigger) this.close()
  }

  private _addOutsideHandler(): void {
    document.addEventListener('mousedown', this._handleOutside)
  }
  private _removeOutsideHandler(): void {
    document.removeEventListener('mousedown', this._handleOutside)
  }

  private _syncOpenState(): void {
    const isOpen = this.open
    this.toggleAttribute('data-open', isOpen)
    this._panelEl?.toggleAttribute('data-open', isOpen)
    if (isOpen) this._addOutsideHandler()
    else this._removeOutsideHandler()
  }

  private _syncAlignState(): void {
    // Reposition if alignment changes while open
    if (this.open) {
      const trigger = this._triggerSlot?.assignedElements({ flatten: true })?.[0] as
        | HTMLElement
        | undefined
      if (trigger) this._positionPanelRelativeTo(trigger)
    }
  }

  private _onOpenChanged(): void {
    if (this.open) {
      this._mountDropdown()
      this._syncOpenState()
      this.dispatchEvent(new CustomEvent('dropdown-show', { bubbles: true }))
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
      this.dispatchEvent(new CustomEvent('dropdown-after-show', { bubbles: true }))
    } else {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
      this.dispatchEvent(new CustomEvent('dropdown-hide', { bubbles: true }))
      this._removeOpenListeners()
      this._unlockBodyScroll()
      // Restore focus to trigger
      const t = this._originalTrigger
      if (t && typeof t.focus === 'function') setTimeout(() => t.focus())
      this.dispatchEvent(new CustomEvent('dropdown-after-hide', { bubbles: true }))
      this._unmountDropdown()
    }
  }
  private _mountDropdown(): void {
    if (this._dialogMounted || !this.shadowRoot) return
    const frag = UIDropdown.tpl.content.cloneNode(true) as DocumentFragment
    const base = frag.querySelector('[data-el="base"]') as HTMLElement | null
    if (base) {
      const firstChild = this.shadowRoot.firstChild
      if (firstChild) this.shadowRoot.insertBefore(base, firstChild)
      else this.shadowRoot.append(base)
    }

    this._queryRefs()
    this._applyListeners()
    this._onContentSlotChange()
    this._onMenuSlotChange()
    this._onTriggerSlotChange()

    this._dialogMounted = true
  }

  private _unmountDropdown(): void {
    if (!this._dialogMounted || !this.shadowRoot) return
    const cleanupSlots: (HTMLSlotElement | null)[] = [this._contentSlot, this._menuSlot]
    for (const slot of cleanupSlots) {
      const nodes = slot?.assignedElements({ flatten: true }) ?? []
      for (const n of nodes) {
        const ac = this._aborters.get(n as HTMLElement)
        ac?.abort()
        this._aborters.delete(n as HTMLElement)
      }
    }
    this._panelEl?.remove()
    this._panelEl = null
    this._arrowEl = null
    this._dialogMounted = false
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

  requestClose(source: Source = 'overlay'): void {
    const ev = new CustomEvent<UIRequestCloseDetail>('dropdown-request-close', {
      bubbles: true,
      cancelable: true,
      detail: { source }
    })
    const notPrevented = this.dispatchEvent(ev)
    if (notPrevented) this.close()
  }

  private _lockBodyScroll(): void {
    document.body.style.overflow = 'hidden'
  }

  private _unlockBodyScroll(): void {
    document.body.style.overflow = ''
  }

  private _cleanup(): void {
    const allSlots: (HTMLSlotElement | null)[] = [
      this._triggerSlot,
      this._contentSlot,
      this._menuSlot
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
    this._removeOutsideHandler()
  }

  get align(): 'start' | 'center' | 'end' {
    const v = this.getAttribute('align')?.toLowerCase()
    return v === 'center' || v === 'end' ? (v as 'center' | 'end') : 'start'
  }

  get open(): boolean {
    return this.hasAttribute('open')
  }

  set open(value: boolean) {
    if (value) this.setAttribute('open', '')
    else this.removeAttribute('open')
  }

  openMenu(): void {
    this.open = true
  }
  close(): void {
    this.open = false
  }
  toggle(): void {
    this.open = !this.open
  }
}

if (!customElements.get('ui-dropdown')) customElements.define('ui-dropdown', UIDropdown)

declare global {
  interface HTMLElementTagNameMap {
    'ui-dropdown': UIDropdown
  }
  interface HTMLElementEventMap {
    'dropdown-show': CustomEvent<void>
    'dropdown-after-show': CustomEvent<void>
    'dropdown-hide': CustomEvent<void>
    'dropdown-after-hide': CustomEvent<void>
    'dropdown-request-close': CustomEvent<UIRequestCloseDetail>
  }
}
