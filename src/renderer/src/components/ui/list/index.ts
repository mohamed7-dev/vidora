import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?inline'
import style from './style.css?inline'

export class UIList extends HTMLElement {
  private _slot: HTMLSlotElement | null = null

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

    this.setAttribute('role', 'listbox')
    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0')

    this._slot = this.shadowRoot?.querySelector('slot') ?? null
    this._slot?.addEventListener('slotchange', () => this._syncOptions())

    this.addEventListener('click', this._onClick)
    this.addEventListener('keydown', this._onKeyDown)

    this._syncA11y()
    this._syncOptions()
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this._onClick)
    this.removeEventListener('keydown', this._onKeyDown)
  }

  static get observedAttributes(): string[] {
    return ['selection']
  }

  attributeChangedCallback(name: string): void {
    if (name === 'selection') this._syncA11y()
  }

  private _syncA11y(): void {
    const multiple = this.selection === 'multiple'
    if (multiple) this.setAttribute('aria-multiselectable', 'true')
    else this.removeAttribute('aria-multiselectable')
  }

  private get _options(): HTMLElement[] {
    const assigned = this._slot?.assignedElements({ flatten: true }) ?? []
    return assigned.filter(
      (n): n is HTMLElement => n instanceof HTMLElement && n.tagName.toLowerCase() === 'ui-option'
    )
  }

  private _syncOptions(): void {
    const opts = this._options
    // Ensure all options have correct roles and tabindex for roving focus
    let firstFocusableSet = false
    for (const o of opts) {
      o.setAttribute('role', 'option')
      // roving tabindex on host list; options manage -1 focusable via click
      if (!firstFocusableSet) {
        if (!o.hasAttribute('tabindex')) o.setAttribute('tabindex', '-1')
        firstFocusableSet = true
      }
      o.setAttribute('aria-selected', String(o.hasAttribute('selected')))
    }
  }

  private _onClick = (ev: MouseEvent): void => {
    const path = (ev.composedPath?.() ?? []) as EventTarget[]
    const target = path.find(
      (t) => t instanceof HTMLElement && t.tagName.toLowerCase() === 'ui-option'
    ) as HTMLElement | undefined
    if (!target) return
    this._selectOption(target, ev.ctrlKey || ev.metaKey || this.selection === 'multiple')
  }

  private _onKeyDown = (ev: KeyboardEvent): void => {
    const opts = this._options
    if (opts.length === 0) return

    const currentIndex = this._getFocusedIndex()
    const lastIndex = opts.length - 1

    switch (ev.key) {
      case 'ArrowDown':
        ev.preventDefault()
        this._focusIndex(Math.min(currentIndex + 1, lastIndex))
        break
      case 'ArrowUp':
        ev.preventDefault()
        this._focusIndex(Math.max(currentIndex - 1, 0))
        break
      case 'Home':
        ev.preventDefault()
        this._focusIndex(0)
        break
      case 'End':
        ev.preventDefault()
        this._focusIndex(lastIndex)
        break
      case ' ': // Space
      case 'Enter':
        ev.preventDefault()
        if (currentIndex >= 0)
          this._selectOption(
            opts[currentIndex],
            ev.ctrlKey || ev.metaKey || this.selection === 'multiple'
          )
        break
      default:
        break
    }
  }

  private _getFocusedIndex(): number {
    const opts = this._options
    const active = (this.getRootNode() as Document | ShadowRoot).activeElement
    const idx = opts.findIndex((o) => o === active || o.contains(active as Node))
    return idx >= 0 ? idx : 0
  }

  private _focusIndex(index: number): void {
    const opts = this._options
    const clamped = Math.max(0, Math.min(index, opts.length - 1))
    const opt = opts[clamped]
    opt?.focus()
  }

  private _selectOption(option: HTMLElement, additive: boolean): void {
    const multiple = this.selection === 'multiple'
    const opts = this._options

    if (!multiple || !additive) {
      for (const o of opts) {
        if (o !== option && o.hasAttribute('selected')) o.removeAttribute('selected')
        o.setAttribute('aria-selected', String(o.hasAttribute('selected')))
      }
    }

    if (multiple && additive) {
      option.toggleAttribute('selected')
    } else {
      option.setAttribute('selected', '')
    }
    option.setAttribute('aria-selected', String(option.hasAttribute('selected')))

    const selected = opts.filter((o) => o.hasAttribute('selected'))
    const values = selected.map((o) => o.getAttribute('value'))
    const detail = {
      value: values[0] ?? null,
      values,
      option
    }
    this.dispatchEvent(new CustomEvent('change', { detail, bubbles: true, composed: true }))
  }

  get selection(): 'single' | 'multiple' {
    const v = this.getAttribute('selection')?.toLowerCase()
    return v === 'multiple' ? 'multiple' : 'single'
  }

  get value(): string | null {
    const first = this._options.find((o) => o.hasAttribute('selected'))
    return first?.getAttribute('value') ?? null
  }

  get values(): (string | null)[] {
    return this._options
      .filter((o) => o.hasAttribute('selected'))
      .map((o) => o.getAttribute('value'))
  }
}

customElements.define('ui-list', UIList)

declare global {
  interface HTMLElementTagNameMap {
    'ui-list': UIList
  }
}
