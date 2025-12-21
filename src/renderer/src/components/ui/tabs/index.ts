import template from './template.html?raw'
import style from './style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../lib/template-loader'

const UI_TAB_NAME = 'ui-tabs'
const ATTRIBUTES = {
  VALUE: 'value'
}

type ChangeEventDetail = {
  value: string
}

export class UITabs extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(template)

  // refs
  private _listEl: HTMLElement | null = null
  private _triggerSlot: HTMLSlotElement | null = null
  private _panelSlot: HTMLSlotElement | null = null
  private _aborters = new WeakMap<HTMLElement, AbortController>()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
  }

  attributeChangedCallback(name: string): void {
    if (name === ATTRIBUTES.VALUE) {
      this._syncSelection()
      this._onSelectionChange()
    }
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._setupListeners()
    this._onTriggerSlotChange()
    this._onPanelSlotChange()
    this._ensureInitialSelection()
    this._syncSelection()
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

  //---------------------------------------Setup----------------------------
  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [UITabs.sheet]
    this.shadowRoot.append(UITabs.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    this._listEl = this.shadowRoot?.querySelector('[data-el="list"]') as HTMLElement | null
    this._triggerSlot = this.shadowRoot?.querySelector('slot[name="tab"]') as HTMLSlotElement | null
    this._panelSlot = this.shadowRoot?.querySelector('slot[name="panel"]') as HTMLSlotElement | null
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

  private _onSelectionChange(): void {
    const v = this.value
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: v } as ChangeEventDetail,
        bubbles: true,
        composed: true
      })
    )
  }

  //--------------------------------Listeners---------------------------

  private _setupListeners(): void {
    this._triggerSlot?.addEventListener('slotchange', () => this._onTriggerSlotChange())
    this._panelSlot?.addEventListener('slotchange', () => this._onPanelSlotChange())
    this._listEl?.addEventListener('keydown', this._onKeydown)
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

  //-------------------------------------Utilities-----------------------------
  private _getTriggers(): HTMLElement[] {
    const nodes = this._triggerSlot?.assignedElements({ flatten: true }) ?? []
    return nodes.filter((n) => n instanceof HTMLElement) as HTMLElement[]
  }

  private _getPanels(): HTMLElement[] {
    const nodes = this._panelSlot?.assignedElements({ flatten: true }) ?? []
    return nodes.filter((n) => n instanceof HTMLElement) as HTMLElement[]
  }

  //-------------------------------------Public API----------------------------
  get value(): string | null {
    return this.getAttribute(ATTRIBUTES.VALUE)
  }
  set value(v: string | null) {
    const current = this.value
    if (v === current) return
    if (v === null) this.removeAttribute(ATTRIBUTES.VALUE)
    else this.setAttribute(ATTRIBUTES.VALUE, v)
  }
}

if (!customElements.get(UI_TAB_NAME)) customElements.define(UI_TAB_NAME, UITabs)

declare global {
  interface HTMLElementTagNameMap {
    [UI_TAB_NAME]: UITabs
  }

  interface HTMLElementEventMap {
    change: CustomEvent<ChangeEventDetail>
  }
}
