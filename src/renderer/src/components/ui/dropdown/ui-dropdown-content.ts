import { UI_DROPDOWN_CONTENT_TAG_NAME, UI_DROPDOWN_ITEM_TAG_NAME } from './constants'

export class UiDropdownContent extends HTMLElement {
  private _rootEl: HTMLDivElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._setupListeners()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .dropdown__content {
          min-width: var(--ui-dropdown-content-min-width, 10rem);
          max-height: var(--ui-dropdown-content-max-height, 15rem);
          overflow: auto;
          border-radius: var(--ui-dropdown-content-border-radius, var(--radius-md));
          border: var(--ui-dropdown-content-border, 1px solid var(--border));
          background: var(--ui-dropdown-content-background-color, var(--popover));
          padding: var(--ui-dropdown-content-padding, var(--spacing-2x-small));
          display: flex;
          flex-direction: column;
          gap: var(--ui-dropdown-content-gap, var(--spacing-2x-small));
        }
      </style>
      <div class="dropdown__content" part="base" data-el="root" role="menu">
        <slot></slot>
      </div>
    `
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._rootEl = this.shadowRoot.querySelector("[data-el='root']")
  }

  private _setupListeners(): void {
    if (!this._rootEl) return
    this._rootEl.addEventListener('keydown', this._onKeyDown as EventListener)
  }

  private _onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return

    const items = Array.from(this.querySelectorAll<HTMLElement>(UI_DROPDOWN_ITEM_TAG_NAME))
    if (items.length === 0) return

    const activeEl = document.activeElement as HTMLElement | null

    let currentIndex = -1
    items.forEach((item, index) => {
      const sr = item.shadowRoot as ShadowRoot | undefined
      if (sr && activeEl && sr.contains(activeEl)) {
        currentIndex = index
        return
      }
      if (activeEl && item.contains(activeEl)) {
        currentIndex = index
      }
    })

    let nextIndex = currentIndex
    if (key === 'ArrowDown') {
      if (currentIndex < 0) nextIndex = 0
      else nextIndex = (currentIndex + 1) % items.length
    } else if (key === 'ArrowUp') {
      if (currentIndex < 0) nextIndex = items.length - 1
      else nextIndex = (currentIndex - 1 + items.length) % items.length
    } else if (key === 'Home') {
      nextIndex = 0
    } else if (key === 'End') {
      nextIndex = items.length - 1
    }

    if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= items.length) return

    event.preventDefault()
    event.stopPropagation()

    const targetItem = items[nextIndex]
    const sr = targetItem.shadowRoot as ShadowRoot | undefined

    let focusTarget: HTMLElement | null = null
    if (sr) {
      focusTarget = sr.querySelector("button, [role='menuitem'], [tabindex]") as HTMLElement | null
    }

    if (!focusTarget) {
      const slot = sr?.querySelector('slot') as HTMLSlotElement | null
      const assigned = (slot?.assignedElements({ flatten: true }) ?? []) as HTMLElement[] | []
      focusTarget = assigned[0] ?? targetItem
    }

    focusTarget?.focus()
  }
}

if (!customElements.get(UI_DROPDOWN_CONTENT_TAG_NAME)) {
  customElements.define(UI_DROPDOWN_CONTENT_TAG_NAME, UiDropdownContent)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DROPDOWN_CONTENT_TAG_NAME]: UiDropdownContent
  }
}
