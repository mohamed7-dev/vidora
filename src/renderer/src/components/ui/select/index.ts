import html from './template.html?raw'
import style from './style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../lib/template-loader'

const ATTRIBUTES = {
  PLACEHOLDER: 'placeholder',
  VALUE: 'value',
  DISABLED: 'disabled'
}

const SELECTED_ATTR = 'data-selected'
const DISABLED_ATTR = 'data-disabled'
const VALUE_ATTR = 'value'

export class UISelect extends HTMLElement {
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  // refs
  private _triggerBtn: HTMLButtonElement | null = null
  private _panelEl: HTMLElement | null = null
  private _triggerLabel: HTMLElement | null = null
  private _slotEl: HTMLSlotElement | null = null
  // states
  private _aborters = new WeakMap<HTMLElement, AbortController>()
  private _isOpen = false
  private _activeIndex = -1

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
  }

  attributeChangedCallback(name: string): void {
    switch (name) {
      case ATTRIBUTES.VALUE:
        this._syncValue()
        break
      case ATTRIBUTES.DISABLED:
        this._syncDisabled()
        break
      case ATTRIBUTES.PLACEHOLDER:
        this._syncPlaceholder()
        break
    }
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()

    if (this._panelEl && !this._panelEl.hasAttribute('tabindex')) {
      this._panelEl.setAttribute('tabindex', '-1')
    }

    this._slotEl?.addEventListener('slotchange', this._handleSlotChange)

    this._bindTrigger()
    this._bindOptions()
    this._syncValue()
    this._syncDisabled()
    this._syncPlaceholder()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.adoptedStyleSheets = [UISelect.sheet]
    this.shadowRoot.append(UISelect.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    this._triggerBtn = this.shadowRoot?.querySelector(
      '[data-el="trigger"]'
    ) as HTMLButtonElement | null
    this._panelEl = this.shadowRoot?.querySelector('[data-el="panel"]') as HTMLElement | null
    this._triggerLabel = this.shadowRoot?.querySelector(
      '[data-el="trigger-label"]'
    ) as HTMLElement | null
    this._slotEl = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null
  }

  disconnectedCallback(): void {
    this._slotEl?.removeEventListener('slotchange', this._handleSlotChange)
    this._unbindOptions()
    document.removeEventListener('mousedown', this._handleOutsideClick, { capture: true })
  }

  private _bindTrigger(): void {
    if (!this._triggerBtn) return
    this._triggerBtn.addEventListener('click', () => {
      if (this.disabled) return
      this._toggle()
    })
    this._triggerBtn.addEventListener('keydown', this._handleKeydown)
  }

  private _bindOptions(): void {
    this._unbindOptions()
    const options = this._optionsArray()
    for (const opt of options) {
      const prev = this._aborters.get(opt)
      prev?.abort()
      const ac = new AbortController()
      this._aborters.set(opt, ac)
      opt.addEventListener(
        'click',
        (event) => {
          if (opt.hasAttribute(DISABLED_ATTR)) return
          const optValue = opt.getAttribute(VALUE_ATTR)
          if (optValue) {
            this.value = optValue
            this.dispatchEvent(new CustomEvent('change', { detail: { value: optValue } }))
          }
          event.stopPropagation()
          this._close()
        },
        { signal: ac.signal }
      )
    }
  }

  private _unbindOptions(): void {
    const options = this._optionsArray()
    for (const opt of options) {
      const ac = this._aborters.get(opt)
      ac?.abort()
    }
    this._aborters = new WeakMap()
  }

  private _handleOutsideClick = (event: MouseEvent): void => {
    if (!this._isOpen) return
    const path = event.composedPath()
    if (!path.includes(this) && !path.includes(this._panelEl as EventTarget)) {
      this._close()
    }
  }

  private _handleSlotChange = (): void => {
    this._bindOptions()
    this._syncValue()
  }

  private _handleKeydown = (event: KeyboardEvent): void => {
    if (this.disabled) return
    const options = this._optionsArray()
    if (!options.length) return

    const openKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' ']
    if (!this._isOpen && openKeys.includes(event.key)) {
      event.preventDefault()
      this._open()
    }

    if (!this._isOpen) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      this._moveActive(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      this._moveActive(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      this._setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      this._setActiveIndex(options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const active = options[this._activeIndex]
      const optValue = active?.getAttribute(VALUE_ATTR)
      if (active && optValue && !active.hasAttribute(DISABLED_ATTR)) {
        this.value = optValue
        this.dispatchEvent(new CustomEvent('change', { detail: { value: optValue } }))
      }
      this._close()
      this._triggerBtn?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this._close()
      this._triggerBtn?.focus()
    }
  }

  //----------------------------------Utils-----------------------------------------
  private _optionsArray(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('ui-option'))
  }

  private _toggle(): void {
    this._isOpen ? this._close() : this._open()
  }

  private _open(): void {
    if (this._isOpen || !this._panelEl) return
    this._isOpen = true
    this._panelEl.toggleAttribute('data-open', true)
    this._triggerBtn?.setAttribute('aria-expanded', 'true')
    this._setActiveToCurrent()
    document.addEventListener('mousedown', this._handleOutsideClick, { capture: true })
  }

  private _close(): void {
    if (!this._isOpen || !this._panelEl) return
    this._isOpen = false
    this._panelEl.toggleAttribute('data-open', false)
    this._triggerBtn?.setAttribute('aria-expanded', 'false')
    this._clearActive()
    document.removeEventListener('mousedown', this._handleOutsideClick, { capture: true })
  }

  private _setActiveToCurrent(): void {
    const options = this._optionsArray()
    const currentValue = this.value
    const currentIndex = currentValue
      ? options.findIndex((opt) => opt.getAttribute(VALUE_ATTR) === currentValue)
      : -1
    const initialIndex = currentIndex >= 0 ? currentIndex : 0
    this._setActiveIndex(initialIndex)
  }

  private _moveActive(delta: number): void {
    const options = this._optionsArray()
    if (!options.length) return
    let next = this._activeIndex
    const startIndex = next
    do {
      next = (next + delta + options.length) % options.length
      if (!options[next].hasAttribute(DISABLED_ATTR)) break
    } while (next !== startIndex)
    this._setActiveIndex(next)
  }

  private _setActiveIndex(index: number): void {
    const options = this._optionsArray()
    if (!options.length) {
      this._clearActive()
      return
    }
    const clamped = Math.max(0, Math.min(index, options.length - 1))
    if (this._activeIndex === clamped) return
    this._clearActive()
    this._activeIndex = clamped
    const active = options[this._activeIndex]
    active?.setAttribute('data-active', '')
    active?.scrollIntoView({ block: 'nearest' })
  }

  private _clearActive(): void {
    const options = this._optionsArray()
    if (this._activeIndex >= 0 && this._activeIndex < options.length) {
      options[this._activeIndex]?.removeAttribute('data-active')
    }
    this._activeIndex = -1
  }
  //----------------------------------Sync States-----------------------------------

  private _syncDisabled(): void {
    this._triggerBtn?.toggleAttribute('disabled', this.disabled)
  }

  private _syncPlaceholder(): void {
    if (this._triggerLabel) {
      if (!this.value) this._triggerLabel.textContent = this.placeholder
    }
  }

  private _syncValue(): void {
    const currentValue = this.value
    const options = this._optionsArray()
    let labelToShow = this.placeholder
    for (const opt of options) {
      const optValue = opt.getAttribute('value')
      const selected = optValue === currentValue
      opt.toggleAttribute(SELECTED_ATTR, !!selected)
      if (selected) labelToShow = opt.textContent?.trim() ?? ''
    }
    if (this._triggerLabel) {
      this._triggerLabel.textContent = labelToShow
    }
  }
  //------------------------------------Public API-----------------------------------

  get value(): string | null {
    return this.getAttribute(ATTRIBUTES.VALUE)
  }

  set value(value: string) {
    this.setAttribute(ATTRIBUTES.VALUE, value)
  }

  get disabled(): boolean {
    return this.hasAttribute(ATTRIBUTES.DISABLED)
  }

  set disabled(value: boolean) {
    if (value) this.setAttribute(ATTRIBUTES.DISABLED, '')
    else this.removeAttribute(ATTRIBUTES.DISABLED)
  }
  get placeholder(): string {
    return this.getAttribute(ATTRIBUTES.PLACEHOLDER) ?? ''
  }

  set placeholder(value: string) {
    this.setAttribute(ATTRIBUTES.PLACEHOLDER, value)
  }
}

customElements.define('ui-select', UISelect)

declare global {
  interface HTMLElementTagNameMap {
    'ui-select': UISelect
  }
}
