import {
  UI_DIALOG_CONTENT_TAG_NAME,
  UI_DIALOG_DESCRIPTION_TAG_NAME,
  UI_DIALOG_TITLE_TAG_NAME
} from './constants'

let nextDialogContentId = 1

function ensureElementId(el: HTMLElement, prefix: string): string {
  if (el.id) return el.id
  const id = `${prefix}-${nextDialogContentId++}`
  el.id = id
  return id
}

export class UiDialogContent extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._ensureA11y()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        .dialog__content {
          background: var(--ui-dialog-content-background, var(--popover));
          color: var(--ui-dialog-content-foreground, var(--popover-foreground));
          border: 1px solid var(--ui-dialog-content-border, var(--border));
          border-radius: var(--ui-dialog-content-radius, var(--radius-md));
          width: var(--ui-dialog-content-width, min(31rem, 90vw));
          height: var(--ui-dialog-content-height, min(35rem, 90vh));
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: var(--ui-dialog-content-padding, var(--spacing-small));
          box-sizing: border-box;
          position: relative;
          box-shadow: var(--shadow-2x-large);
        }
      </style>
      <div class="dialog__content" part="base">
        <slot></slot>
      </div>
    `
  }

  private _ensureA11y(): void {
    // DEV-only guard: ensure that each dialog has a title and description
    // components in its subtree. This helps catch accessibility regressions
    // early during development.
    if (import.meta.env && import.meta.env.DEV) {
      const hasTitle = !!this.querySelector(UI_DIALOG_TITLE_TAG_NAME)
      const hasDescription = !!this.querySelector(UI_DIALOG_DESCRIPTION_TAG_NAME)

      if (!hasTitle || !hasDescription) {
        throw new Error(
          `${UI_DIALOG_CONTENT_TAG_NAME}: Missing required <${UI_DIALOG_TITLE_TAG_NAME}> or <${UI_DIALOG_DESCRIPTION_TAG_NAME}> in dialog content subtree (dev-only check).`
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
    const titleEl = this.querySelector(UI_DIALOG_TITLE_TAG_NAME) as HTMLElement | null
    const descEl = this.querySelector(UI_DIALOG_DESCRIPTION_TAG_NAME) as HTMLElement | null

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

if (!customElements.get(UI_DIALOG_CONTENT_TAG_NAME)) {
  customElements.define(UI_DIALOG_CONTENT_TAG_NAME, UiDialogContent)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_DIALOG_CONTENT_TAG_NAME]: UiDialogContent
  }
}
