import template from './template.html?raw'
import style from './style.css?inline'

export class UITabs extends HTMLElement {
  private _listEl: HTMLElement | null = null
  private _triggerSlot: HTMLSlotElement | null = null
  private _panelSlot: HTMLSlotElement | null = null
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
    styleEl.textContent = style
    this.shadowRoot?.append(styleEl, content)

    this._listEl = this.shadowRoot?.querySelector('[role="tablist"]') as HTMLElement | null
    this._triggerSlot = this.shadowRoot?.querySelector('slot[name="tab"]') as HTMLSlotElement | null
    this._panelSlot = this.shadowRoot?.querySelector('slot[name="panel"]') as HTMLSlotElement | null

    this._onTriggerSlotChange()
    this._triggerSlot?.addEventListener('slotchange', () => this._onTriggerSlotChange())
    this._onPanelSlotChange()
    this._panelSlot?.addEventListener('slotchange', () => this._onPanelSlotChange())

    this._ensureInitialSelection()
    this._syncSelection()

    this._listEl?.addEventListener('keydown', this._onKeydown)
  }

  disconnectedCallback(): void {
    this._listEl?.removeEventListener('keydown', this._onKeydown)
    const triggers = this._getTriggers()
    for (const t of triggers) {
      const ac = this._aborters.get(t)
      ac?.abort()
      this._aborters.delete(t)
    }
  }

  static get observedAttributes(): string[] {
    return ['value']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'value') {
      this._syncSelection()
      const v = this.value
      this.dispatchEvent(
        new CustomEvent('change', { detail: { value: v }, bubbles: true, composed: true })
      )
    }
  }

  private _getTriggers(): HTMLElement[] {
    const nodes = this._triggerSlot?.assignedElements({ flatten: true }) ?? []
    return nodes.filter((n) => n instanceof HTMLElement) as HTMLElement[]
  }

  private _getPanels(): HTMLElement[] {
    const nodes = this._panelSlot?.assignedElements({ flatten: true }) ?? []
    return nodes.filter((n) => n instanceof HTMLElement) as HTMLElement[]
  }

  private _onTriggerSlotChange(): void {
    const triggers = this._getTriggers()
    for (const t of triggers) {
      const prev = this._aborters.get(t)
      prev?.abort()
      const ac = new AbortController()
      this._aborters.set(t, ac)

      t.setAttribute('role', 'tab')
      t.setAttribute('tabindex', '-1')

      t.addEventListener(
        'click',
        () => {
          const v = t.getAttribute('data-value') || t.getAttribute('value') || ''
          if (v) this.value = v
          t.focus()
        },
        { signal: ac.signal }
      )
    }
    this._syncSelection()
  }

  private _onPanelSlotChange(): void {
    const panels = this._getPanels()
    for (const p of panels) {
      p.setAttribute('role', 'tabpanel')
    }
    this._syncSelection()
  }

  private _ensureInitialSelection(): void {
    if (this.value) return
    const first = this._getTriggers()[0]
    const v = first?.getAttribute('data-value') || first?.getAttribute('value')
    if (v) this.value = v
  }

  private _syncSelection(): void {
    const value = this.value
    const triggers = this._getTriggers()
    const panels = this._getPanels()

    for (const t of triggers) {
      const tv = t.getAttribute('data-value') || t.getAttribute('value')
      const selected = tv === value
      t.toggleAttribute('data-selected', !!selected)
      t.setAttribute('aria-selected', selected ? 'true' : 'false')
      t.setAttribute('tabindex', selected ? '0' : '-1')
    }

    for (const p of panels) {
      const pv = p.getAttribute('data-value') || p.getAttribute('value')
      const shown = pv === value
      p.toggleAttribute('data-selected', !!shown)
      p.toggleAttribute('hidden', !shown)
    }
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    const triggers = this._getTriggers()
    if (triggers.length === 0) return

    const currentIndex = Math.max(
      0,
      triggers.findIndex(
        (t) => (t.getAttribute('data-value') || t.getAttribute('value')) === this.value
      )
    )

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = triggers[(currentIndex + 1) % triggers.length]
      const v = next.getAttribute('data-value') || next.getAttribute('value')
      if (v) this.value = v
      next.focus()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = triggers[(currentIndex - 1 + triggers.length) % triggers.length]
      const v = prev.getAttribute('data-value') || prev.getAttribute('value')
      if (v) this.value = v
      prev.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      const first = triggers[0]
      const v = first.getAttribute('data-value') || first.getAttribute('value')
      if (v) this.value = v
      first.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      const last = triggers[triggers.length - 1]
      const v = last.getAttribute('data-value') || last.getAttribute('value')
      if (v) this.value = v
      last.focus()
    }
  }

  get value(): string | null {
    return this.getAttribute('value')
  }
  set value(v: string | null) {
    const current = this.getAttribute('value')
    if (v === current) return
    if (v === null) this.removeAttribute('value')
    else this.setAttribute('value', v)
  }
}

customElements.define('ui-tabs', UITabs)
