import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?inline'
import style from './style.css?inline'

export class UIDropdown extends HTMLElement {
  private _panelEl: HTMLElement | null = null
  private _arrowEl: HTMLElement | null = null
  private _triggerSlot: HTMLSlotElement | null = null
  private _contentSlot: HTMLSlotElement | null = null
  private _menuSlot: HTMLSlotElement | null = null
  private _aborters = new WeakMap<HTMLElement, AbortController>()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)
    const styleEl = document.createElement('style')
    styleEl.textContent = resetStyle + style
    this.shadowRoot?.append(styleEl, content)

    this._panelEl = this.shadowRoot?.querySelector('[data-panel]') as HTMLElement | null
    this._arrowEl = this.shadowRoot?.querySelector('[data-arrow]') as HTMLElement | null
    this._triggerSlot = this.shadowRoot?.querySelector(
      'slot[name="trigger"]'
    ) as HTMLSlotElement | null
    this._contentSlot = this.shadowRoot?.querySelector(
      'slot[name="content"]'
    ) as HTMLSlotElement | null
    this._menuSlot = this.shadowRoot?.querySelector(
      'slot[name="menu-item"]'
    ) as HTMLSlotElement | null

    this._onTriggerSlotChange()
    this._triggerSlot?.addEventListener('slotchange', () => this._onTriggerSlotChange())
    this._onContentSlotChange()
    this._contentSlot?.addEventListener('slotchange', () => this._onContentSlotChange())
    this._onMenuSlotChange()
    this._menuSlot?.addEventListener('slotchange', () => this._onMenuSlotChange())

    document.addEventListener('keydown', this._onKeydown)
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onKeydown)
    // cleanup bound handlers on trigger and menu items
    const triggerNodes = this._triggerSlot?.assignedElements({ flatten: true }) ?? []
    for (const n of triggerNodes) {
      const ac = this._aborters.get(n as HTMLElement)
      ac?.abort()
      this._aborters.delete(n as HTMLElement)
    }
    const contentNodes = this._contentSlot?.assignedElements({ flatten: true }) ?? []
    for (const c of contentNodes) {
      const items = (c as HTMLElement).querySelectorAll('[slot="menu-item"]')
      items.forEach((i) => {
        const ac = this._aborters.get(i as HTMLElement)
        ac?.abort()
        this._aborters.delete(i as HTMLElement)
      })
    }
    const menuItems = this._menuSlot?.assignedElements({ flatten: true }) ?? []
    for (const i of menuItems) {
      const ac = this._aborters.get(i as HTMLElement)
      ac?.abort()
      this._aborters.delete(i as HTMLElement)
    }
    this._removeOutsideHandler()
  }

  static get observedAttributes(): string[] {
    return ['open', 'align']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'open') {
      this._syncOpenState()
    } else if (name === 'align') {
      // Reposition if alignment changes while open
      if (this.open) {
        const trigger = this._triggerSlot?.assignedElements({ flatten: true })?.[0] as
          | HTMLElement
          | undefined
        if (trigger) this._positionPanelRelativeTo(trigger)
      }
    }
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) this.close()
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

  get align(): 'start' | 'center' | 'end' {
    const v = this.getAttribute('align')?.toLowerCase()
    return v === 'center' || v === 'end' ? (v as 'center' | 'end') : 'start'
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

customElements.define('ui-dropdown', UIDropdown)
