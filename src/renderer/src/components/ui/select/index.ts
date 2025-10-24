import template from './template.html?raw'
import style from './style.css?inline'

const VALUE_ATTR = 'value'
const DISABLED_ATTR = 'disabled'
const SELECTED_ATTR = 'data-selected'
const OPTION_TAG = 'ui-option'

export class UISelect extends HTMLElement {
  private _triggerBtn: HTMLButtonElement | null = null
  private _panelEl: HTMLElement | null = null
  private _valueSpan: HTMLElement | null = null
  private _slotEl: HTMLSlotElement | null = null
  private _aborters = new WeakMap<HTMLElement, AbortController>()
  private _isOpen = false
  private _activeIndex = -1

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

    this._triggerBtn = this.shadowRoot?.querySelector('[data-trigger]') as HTMLButtonElement | null
    this._panelEl = this.shadowRoot?.querySelector('[data-panel]') as HTMLElement | null
    this._valueSpan = this.shadowRoot?.querySelector('[data-value]') as HTMLElement | null
    this._slotEl = this.shadowRoot?.querySelector('slot') as HTMLSlotElement | null

    if (this._panelEl && !this._panelEl.hasAttribute('tabindex')) {
      this._panelEl.setAttribute('tabindex', '-1')
    }

    this._slotEl?.addEventListener('slotchange', this._handleSlotChange)

    this._bindTrigger()
    this._bindOptions()
    this._syncFromValue()
    this._syncDisabled()
  }

  disconnectedCallback(): void {
    this._slotEl?.removeEventListener('slotchange', this._handleSlotChange)
    this._unbindOptions()
    document.removeEventListener('mousedown', this._handleOutsideClick, { capture: true })
  }

  static get observedAttributes(): string[] {
    return [VALUE_ATTR, DISABLED_ATTR]
  }

  attributeChangedCallback(name: string): void {
    if (name === VALUE_ATTR) this._syncFromValue()
    if (name === DISABLED_ATTR) this._syncDisabled()
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

  private _optionsArray(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>(OPTION_TAG))
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

  private _handleOutsideClick = (event: MouseEvent): void => {
    if (!this._isOpen) return
    const path = event.composedPath()
    if (!path.includes(this) && !path.includes(this._panelEl as EventTarget)) {
      this._close()
    }
  }

  private _syncFromValue(): void {
    const currentValue = this.value
    const options = this._optionsArray()
    let labelToShow = this.getAttribute('placeholder') ?? ''
    for (const opt of options) {
      const optValue = opt.getAttribute(VALUE_ATTR)
      const selected = optValue === currentValue
      opt.toggleAttribute(SELECTED_ATTR, !!selected)
      if (selected) labelToShow = opt.textContent?.trim() ?? ''
    }
    if (this._valueSpan) {
      this._valueSpan.textContent = labelToShow || this.getAttribute('placeholder') || ''
    }
  }

  private _syncDisabled(): void {
    const isDisabled = this.disabled
    this._triggerBtn?.toggleAttribute('disabled', isDisabled)
  }

  private _handleSlotChange = (): void => {
    this._bindOptions()
    this._syncFromValue()
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

  get value(): string | null {
    return this.getAttribute(VALUE_ATTR)
  }

  set value(newValue: string | null) {
    if (newValue === null) this.removeAttribute(VALUE_ATTR)
    else this.setAttribute(VALUE_ATTR, newValue)
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    if (value) this.setAttribute('disabled', '')
    else this.removeAttribute('disabled')
    this._syncDisabled()
  }
}

customElements.define('ui-select', UISelect)

declare global {
  interface HTMLElementTagNameMap {
    'ui-select': UISelect
  }
}
