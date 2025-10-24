import template from './template.html?raw'
import style from './style.css?inline'

type SheetSide = 'left' | 'right' | 'top' | 'bottom'

export class USheet extends HTMLElement {
  private _overlayEl: HTMLElement | null = null
  private _panelEl: HTMLElement | null = null
  private _triggerSlot: HTMLSlotElement | null = null
  private _cancelSlot: HTMLSlotElement | null = null
  private _footerSlot: HTMLSlotElement | null = null
  private _aborters = new WeakMap<HTMLElement, AbortController>()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const templateElement = tree.querySelector<HTMLTemplateElement>('template')
    if (!templateElement) return

    const content = templateElement.content.cloneNode(true)
    const styleElement = document.createElement('style')
    styleElement.textContent = style
    this.shadowRoot?.append(styleElement, content)

    this._overlayEl = this.shadowRoot?.querySelector('[data-overlay]') as HTMLElement | null
    this._panelEl = this.shadowRoot?.querySelector('.panel') as HTMLElement | null
    this._triggerSlot = this.shadowRoot?.querySelector(
      'slot[name="trigger"]'
    ) as HTMLSlotElement | null
    this._cancelSlot = this.shadowRoot?.querySelector(
      'slot[name="cancel"]'
    ) as HTMLSlotElement | null
    this._footerSlot = this.shadowRoot?.querySelector(
      'slot[name="footer"]'
    ) as HTMLSlotElement | null

    this._overlayEl?.addEventListener('click', () => this.close())
    this._onTriggerSlotChange()
    this._triggerSlot?.addEventListener('slotchange', () => this._onTriggerSlotChange())
    this._onCancelSlotChange()
    this._cancelSlot?.addEventListener('slotchange', () => this._onCancelSlotChange())
    this._onFooterSlotChange()
    this._footerSlot?.addEventListener('slotchange', () => this._onFooterSlotChange())

    document.addEventListener('keydown', this._onKeydown)

    if (!this.hasAttribute('side')) this.setAttribute('side', 'left')
    this._syncSide()
    this._syncOpenState()
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onKeydown)
    // cleanup trigger listeners
    const nodes = this._triggerSlot?.assignedElements({ flatten: true }) ?? []
    for (const n of nodes) {
      const el = n as HTMLElement
      const ac = this._aborters.get(el)
      ac?.abort()
      this._aborters.delete(el)
    }
    // cleanup cancel listeners
    const cancelNodes = this._cancelSlot?.assignedElements({ flatten: true }) ?? []
    for (const n of cancelNodes) {
      const el = n as HTMLElement
      const ac = this._aborters.get(el)
      ac?.abort()
      this._aborters.delete(el)
    }
    // cleanup footer-cancel listeners
    const footerNodes = this._footerSlot?.assignedElements({ flatten: true }) ?? []
    for (const container of footerNodes) {
      const btns = (container as HTMLElement).querySelectorAll('[slot="cancel"]')
      btns.forEach((b) => {
        const ac = this._aborters.get(b as HTMLElement)
        ac?.abort()
        this._aborters.delete(b as HTMLElement)
      })
    }
  }

  static get observedAttributes(): string[] {
    return ['open', 'side']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'open') this._syncOpenState()
    if (name === 'side') this._syncSide()
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) this.close()
  }

  private _onTriggerSlotChange(): void {
    const nodes = this._triggerSlot?.assignedElements({ flatten: true }) ?? []
    if (nodes.length > 0) {
      // Bind the first actionable trigger
      const el = nodes[0] as HTMLElement
      this._bindTrigger(el)
    }
  }

  private _onCancelSlotChange(): void {
    const nodes = this._cancelSlot?.assignedElements({ flatten: true }) ?? []
    if (nodes.length > 0) {
      const el = nodes[0] as HTMLElement
      this._bindCancel(el)
    }
  }

  private _onFooterSlotChange(): void {
    const containers = this._footerSlot?.assignedElements({ flatten: true }) ?? []
    for (const c of containers) {
      const cancelButtons = (c as HTMLElement).querySelectorAll('[slot="cancel"]')
      cancelButtons.forEach((btn) => this._bindCancel(btn as HTMLElement))
    }
  }

  private _bindTrigger(el: HTMLElement): void {
    // Abort any previous listener for this element
    const prev = this._aborters.get(el)
    prev?.abort()

    const ac = new AbortController()
    this._aborters.set(el, ac)
    el.addEventListener('click', () => this.toggle(), { signal: ac.signal })
  }

  private _bindCancel(el: HTMLElement): void {
    const prev = this._aborters.get(el)
    prev?.abort()

    const ac = new AbortController()
    this._aborters.set(el, ac)
    el.addEventListener('click', () => this.close(), { signal: ac.signal })
  }

  private _syncOpenState(): void {
    const isOpen = this.open
    this.toggleAttribute('data-open', isOpen)
    this._overlayEl?.toggleAttribute('data-open', isOpen)
    this._panelEl?.toggleAttribute('data-open', isOpen)
  }

  private _syncSide(): void {
    const side = this.side
    if (!this._panelEl) return
    this._panelEl.setAttribute('data-side', side)
  }

  get open(): boolean {
    return this.hasAttribute('open')
  }

  set open(value: boolean) {
    if (value) this.setAttribute('open', '')
    else this.removeAttribute('open')
  }

  get side(): SheetSide {
    const val = this.getAttribute('side') as SheetSide | null
    return (val ?? 'left') as SheetSide
  }

  set side(value: SheetSide) {
    this.setAttribute('side', value)
  }

  openSheet(): void {
    this.open = true
  }

  close(): void {
    this.open = false
  }

  toggle(): void {
    this.open = !this.open
  }
}

customElements.define('ui-sheet', USheet)
