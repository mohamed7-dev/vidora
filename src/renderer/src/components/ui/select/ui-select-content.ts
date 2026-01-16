import { sharedStyle } from '@renderer/lib/ui/shared-style'
import {
  UI_SELECT_CONTENT_TAG_NAME,
  UI_SELECT_OPTION_ATTRIBUTES,
  UI_SELECT_OPTION_TAG_NAME
} from './constants'

export class UiSelectContent extends HTMLElement {
  // refs
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
        ${sharedStyle}
        .select__content {
          min-width: var(--ui-select-content-min-width, 10rem);
          max-height: var(--ui-select-content-max-height, 15rem);
          overflow-y: auto;
          border-radius: var(--ui-select-content-border-radius, var(--radius-md));
          border: var(--ui-select-content-border, 1px solid var(--border));
          background: var(--ui-select-content-background-color, var(--card));
          padding: var(--ui-select-content-padding, var(--spacing-x-small));
          display: flex;
          flex-direction: column;
          gap: var(--ui-select-content-gap, var(--spacing-2x-small));
          box-shadow: var(--shadow-x-large);
        }
        .select__content:focus-visible {
          outline: none;
        }
      </style>
      <div class="select__content" part="base" data-el="root" role="listbox">
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
    if (key !== 'ArrowDown' && key !== 'ArrowUp') return

    // When content is portaled, its options are no longer descendants
    // of the <ui-select> element in the light DOM. Instead, they stay
    // attached to this content subtree, so we navigate relative to
    // this component.
    const options = Array.from(this.querySelectorAll<HTMLElement>(UI_SELECT_OPTION_TAG_NAME))
    if (options.length === 0) return

    const activeEl = document.activeElement as HTMLElement | null

    // Find index of the option that currently contains focus.
    let currentIndex = -1
    options.forEach((option, index) => {
      // Prefer explicitly selected option if no focused match yet.
      if (
        currentIndex === -1 &&
        option.getAttribute(UI_SELECT_OPTION_ATTRIBUTES.DATA_SELECTED) !== null
      ) {
        currentIndex = index
      }

      const sr = option.shadowRoot as ShadowRoot | undefined
      if (sr && activeEl && sr.contains(activeEl)) {
        currentIndex = index
        return
      }
      if (activeEl && option.contains(activeEl)) {
        currentIndex = index
      }
    })

    let nextIndex = currentIndex
    if (key === 'ArrowDown') {
      if (currentIndex < 0) {
        nextIndex = 0
      } else {
        nextIndex = (currentIndex + 1) % options.length
      }
    } else if (key === 'ArrowUp') {
      if (currentIndex < 0) {
        nextIndex = options.length - 1
      } else {
        nextIndex = (currentIndex - 1 + options.length) % options.length
      }
    }

    if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= options.length) return

    event.preventDefault()
    event.stopPropagation()

    const targetOption = options[nextIndex]
    const sr = targetOption.shadowRoot as ShadowRoot | undefined

    let focusTarget: HTMLElement | null = null
    if (sr) {
      focusTarget = sr.querySelector("button, [role='option'], [tabindex]") as HTMLElement | null
    }

    if (!focusTarget) {
      // as-child case: focus the first assigned element.
      const slot = sr?.querySelector('slot') as HTMLSlotElement | null
      const assigned = (slot?.assignedElements({ flatten: true }) ?? []) as HTMLElement[] | []
      focusTarget = assigned[0] ?? targetOption
    }

    focusTarget?.focus()
  }
}

if (!customElements.get(UI_SELECT_CONTENT_TAG_NAME)) {
  customElements.define(UI_SELECT_CONTENT_TAG_NAME, UiSelectContent)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SELECT_CONTENT_TAG_NAME]: UiSelectContent
  }
}
