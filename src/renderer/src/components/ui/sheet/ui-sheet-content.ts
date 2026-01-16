import { ensureSheet, type UiSheet } from './ui-sheet'
import {
  UI_SHEET_CONTENT_TAG_NAME,
  UI_SHEET_DESCRIPTION_TAG_NAME,
  UI_SHEET_TITLE_TAG_NAME
} from './constants'

let nextSheetContentId = 1

function ensureElementId(el: HTMLElement, prefix: string): string {
  if (el.id) return el.id
  const id = `${prefix}-${nextSheetContentId++}`
  el.id = id
  return id
}

export class UiSheetContent extends HTMLElement {
  private _sheet: UiSheet | null = null
  private _sideChangeUnsubscribe: (() => void) | null = null
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._sheet = ensureSheet(this, UI_SHEET_CONTENT_TAG_NAME)
    this._render()
    this._ensureA11y()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._sideChangeUnsubscribe?.()
    this._sideChangeUnsubscribe = null
  }

  private _setupListeners(): void {
    this._sideChangeUnsubscribe = this._sheet?.onSideChange(this._syncSide.bind(this)) ?? null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .sheet__content {
          position: fixed;
          background: var(--ui-sheet-background, var(--popover));
          color: var(--ui-sheet-foreground, var(--popover-foreground));
          display: flex;
          flex-direction: column;
          padding: var(--ui-sheet-padding, var(--spacing-small));
          box-sizing: border-box;
          box-shadow: var(--shadow-2x-large);
        }
        
        :host([data-side='right']) .sheet__content,
        :host([data-side='left']) .sheet__content {
          height: var(--ui-sheet-height, 100vh);
          width: var(--ui-sheet-width, min(420px, 90vw));
        }

        :host([data-side='right']) .sheet__content {
          top: 0;
          right: 0;
          border-inline-start: 1px solid var(--ui-sheet-border, var(--border));
        }

        :host([data-side='left']) .sheet__content {
          top: 0;
          left: 0;
          border-inline-end: 1px solid var(--ui-sheet-border, var(--border));
        }

        :host([data-side='top']) .sheet__content,
        :host([data-side='bottom']) .sheet__content {
          height: var(--ui-sheet-height, min(50vh, 560px));
          width: var(--ui-sheet-width, 100vw);
        }

        :host([data-side='top']) .sheet__content {
          top: 0;
          left: 0;
          border-bottom: 1px solid var(--ui-sheet-border, var(--border));
        }

        :host([data-side='bottom']) .sheet__content {
          bottom: 0;
          left: 0;
          border-top: 1px solid var(--ui-sheet-border, var(--border));
        }
      </style>
      <div class="sheet__content" part="base">
        <slot></slot>
      </div>
    `
  }

  private _syncSide(): void {
    if (!this._sheet) return
    this.setAttribute('data-side', this._sheet.side)
  }

  private _ensureA11y(): void {
    // DEV-only guard: ensure that each dialog has a title and description
    // components in its subtree. This helps catch accessibility regressions
    // early during development.
    if (import.meta.env && import.meta.env.DEV) {
      const hasTitle = !!this.querySelector(UI_SHEET_TITLE_TAG_NAME)
      const hasDescription = !!this.querySelector(UI_SHEET_DESCRIPTION_TAG_NAME)

      if (!hasTitle || !hasDescription) {
        throw new Error(
          `${UI_SHEET_CONTENT_TAG_NAME}: Missing required <${UI_SHEET_TITLE_TAG_NAME}> or <${UI_SHEET_DESCRIPTION_TAG_NAME}> in sheet content subtree (dev-only check).`
        )
      }
    }

    // Ensure base dialog semantics when not explicitly provided.
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'dialog')
    }
    if (!this.hasAttribute('aria-modal')) {
      this.setAttribute('aria-modal', 'true')
    }

    // Auto-wire aria-labelledby / aria-describedby to the first title and
    // description elements in the subtree, generating IDs when needed.
    const titleEl = this.querySelector(UI_SHEET_TITLE_TAG_NAME) as HTMLElement | null
    const descEl = this.querySelector(UI_SHEET_DESCRIPTION_TAG_NAME) as HTMLElement | null

    if (titleEl && !this.hasAttribute('aria-labelledby')) {
      const id = ensureElementId(titleEl, 'dialog-title')
      this.setAttribute('aria-labelledby', id)
    }

    if (descEl && !this.hasAttribute('aria-describedby')) {
      const id = ensureElementId(descEl, 'dialog-description')
      this.setAttribute('aria-describedby', id)
    }
  }
}

if (!customElements.get(UI_SHEET_CONTENT_TAG_NAME)) {
  customElements.define(UI_SHEET_CONTENT_TAG_NAME, UiSheetContent)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_SHEET_CONTENT_TAG_NAME]: UiSheetContent
  }
}
