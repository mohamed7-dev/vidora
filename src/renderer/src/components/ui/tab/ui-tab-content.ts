import {
  ChangeValueEventDetail,
  UI_TAB_CONTENT_TAG_NAME,
  UI_TAB_EVENTS,
  UI_TAB_TAG_NAME
} from './constants'
import { type UiTab } from './ui-tab'

export class UiTabContent extends HTMLElement {
  private _tabRoot: UiTab | null = null
  private _mounted = false
  private _fragment: DocumentFragment | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._tabRoot = this._findTabRoot()
    this._setupListeners()
    this._syncToCurrentValue()
  }

  disconnectedCallback(): void {
    this._teardownListeners()
    this._unmountChildren()
    this._tabRoot = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .tab__content {
          padding: var(--ui-tab-content-padding, var(--spacing-x-small));
        }
      </style>
      <div part="base" class="tab__content" role="tabpanel">
        <slot></slot>
      </div>
    `
  }

  private _findTabRoot(): UiTab | null {
    const root = this.closest(UI_TAB_TAG_NAME)
    return (root as UiTab | null) ?? null
  }

  private _setupListeners(): void {
    if (!this._tabRoot) return
    this._tabRoot.addEventListener(
      UI_TAB_EVENTS.VALUE_CHANGE,
      this._onTabValueChange as EventListener
    )
  }

  private _teardownListeners(): void {
    if (!this._tabRoot) return
    this._tabRoot.removeEventListener(
      UI_TAB_EVENTS.VALUE_CHANGE,
      this._onTabValueChange as EventListener
    )
  }

  private _onTabValueChange = (event: Event): void => {
    const custom = event as CustomEvent<ChangeValueEventDetail>
    if (!custom.detail) return
    this._syncToCurrentValue(custom.detail.value ?? null)
  }

  private _syncToCurrentValue(currentValue?: string | null): void {
    const ownValue = this.getAttribute('value')
    const effectiveRootValue =
      currentValue !== undefined
        ? currentValue
        : (this._tabRoot?.value ?? this._tabRoot?.getAttribute('value') ?? null)

    const shouldBeMounted =
      ownValue != null && effectiveRootValue != null && ownValue === effectiveRootValue

    if (shouldBeMounted) {
      this._mountChildren()
      this.removeAttribute('hidden')
    } else {
      this._unmountChildren()
      this.setAttribute('hidden', '')
    }
  }

  private _ensureFragment(): DocumentFragment {
    if (!this._fragment) {
      this._fragment = document.createDocumentFragment()
    }
    return this._fragment
  }

  private _mountChildren(): void {
    if (this._mounted) return
    const fragment = this._fragment
    if (!fragment) return

    while (fragment.firstChild) {
      this.appendChild(fragment.firstChild)
    }
    this._mounted = true
  }

  private _unmountChildren(): void {
    if (!this._mounted) {
      if (!this._fragment) {
        this._fragment = document.createDocumentFragment()
      }
    }
    const fragment = this._ensureFragment()
    while (this.firstChild) {
      fragment.appendChild(this.firstChild)
    }
    this._mounted = false
  }
}

if (!customElements.get(UI_TAB_CONTENT_TAG_NAME)) {
  customElements.define(UI_TAB_CONTENT_TAG_NAME, UiTabContent)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_TAB_CONTENT_TAG_NAME]: UiTabContent
  }
}
