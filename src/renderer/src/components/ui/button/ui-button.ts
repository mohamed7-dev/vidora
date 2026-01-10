import html from './ui-button.template.html?raw'
import style from './ui-button.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { resetAssociatedForm, submitAssociatedForm } from '@renderer/lib/ui/form-control'
import { mergeHostAttributesToTarget, resolveAsChildTarget } from '@renderer/lib/ui/slot'

export const UI_BUTTON_TAG_NAME = 'ui-button'

const UI_BUTTON_ATTRIBUTES = {
  BLOCK: 'block',
  VARIANT: 'variant',
  SIZE: 'size',
  DISABLED: 'disabled',
  LOADING: 'loading',
  TOGGLE: 'toggle',
  PRESSED: 'pressed',
  TYPE: 'type',
  NAME: 'name',
  VALUE: 'value'
}

export type UIButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
export type UIButtonSize = 'sm' | 'default' | 'lg' | 'icon'

export class UiButton extends HTMLElement {
  private static readonly template = createTemplateFromHtml(html)
  private static readonly sheet = createStyleSheetFromStyle(style)

  private _eventsAborter: AbortController | null = null
  private _asChildTarget: HTMLElement | null = null
  private _isAsChild = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  static get observedAttributes(): string[] {
    return [
      UI_BUTTON_ATTRIBUTES.DISABLED,
      UI_BUTTON_ATTRIBUTES.LOADING,
      UI_BUTTON_ATTRIBUTES.PRESSED
    ]
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    switch (name) {
      case UI_BUTTON_ATTRIBUTES.DISABLED:
        this._syncInteractiveState()
        break
      case UI_BUTTON_ATTRIBUTES.LOADING:
        if (newValue === oldValue) break
        this._syncLoading()
        this._syncInteractiveState()
        break
      case UI_BUTTON_ATTRIBUTES.PRESSED:
        if (newValue === oldValue) break
        this._syncPressed()
        break
      default:
        break
    }
  }

  connectedCallback(): void {
    this._render()
    // Resolve as-child target (if any) before initializing behavior.
    const target = resolveAsChildTarget(this, {
      requireSingleChild: true
    })
    this._asChildTarget = target
    this._isAsChild = target !== this

    this._init()
    this._bindKeyboardA11y()
    this._bindClickBehavior()

    if (this._isAsChild) {
      this._applyAsChildBehavior()
    }
  }

  disconnectedCallback(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.adoptedStyleSheets = [UiButton.sheet]
    this.shadowRoot.append(UiButton.template.content.cloneNode(true))
  }

  private _init(): void {
    const tabIndex = this.disabled || this.loading ? -1 : 0
    // In regular mode the host is the interactive surface. When as-child is
    // enabled, the slotted child becomes the interactive element instead.
    if (this._isAsChild) {
      this.removeAttribute('role')
      this.tabIndex = -1
      if (this._asChildTarget) {
        this._asChildTarget.tabIndex = tabIndex
      }
    } else {
      this.tabIndex = tabIndex
      this.setAttribute('role', this.getAttribute('role') ?? 'button')
    }
    this.variant = this.variant || 'default'
    this.size = this.size || 'default'
    this._syncLoading()
    this._syncInteractiveState()
    this._syncPressed()
  }

  private _bindClickBehavior(): void {
    if (this._isAsChild) return
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal

    this.addEventListener(
      'click',
      (event) => {
        if (this.disabled || this.loading) {
          event.preventDefault()
          event.stopImmediatePropagation()
          return
        }

        // Form integration: when used as a submit or reset button, trigger the
        // associated form's action via a temporary native button. This ensures
        // constraint validation and submit events behave like a real <button>.
        if (this.type === 'submit') {
          event.preventDefault()
          submitAssociatedForm(
            this,
            this as HTMLElement & {
              name?: string | null
              value?: string | null
            }
          )
        } else if (this.type === 'reset') {
          event.preventDefault()
          resetAssociatedForm(
            this,
            this as HTMLElement & {
              name?: string | null
              value?: string | null
            }
          )
        }

        // Toggle behavior: when [toggle] is present, flip pressed state on click
        if (this.toggle) {
          this.pressed = !this.pressed
          this.dispatchEvent(
            new CustomEvent('ui-toggle', {
              detail: { pressed: this.pressed },
              bubbles: true,
              composed: true
            })
          )
        }
      },
      { signal }
    )
  }

  private _bindKeyboardA11y(): void {
    if (this._isAsChild) return
    this.addEventListener('keydown', (e) => {
      if (this.disabled || this.loading) return

      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
      }
    })

    this.addEventListener('keyup', (e) => {
      if (this.disabled || this.loading) return

      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault()
        this.click()
      }
    })
  }

  private _syncPressed(): void {
    if (this.toggle) {
      this.setAttribute('aria-pressed', this.pressed ? 'true' : 'false')
    } else {
      this.removeAttribute('aria-pressed')
    }
  }

  private _syncLoading(): void {
    const existingIcon = this.querySelector("ui-icon[name='loader-circle']")
    if (this.loading) {
      if (!existingIcon) {
        const icon = document.createElement('ui-icon')
        icon.setAttribute('name', 'loader-circle')
        icon.setAttribute('spin', '')
        icon.setAttribute('aria-hidden', 'true')
        this.prepend(icon)
      }
    } else if (existingIcon) {
      // Remove existing loader icon if present
      existingIcon.remove()
    }
    this.ariaBusy = this.loading ? 'true' : 'false'
  }

  private _syncInteractiveState(): void {
    const isDisabledLike = this.disabled || this.loading

    if (!this._isAsChild) {
      this.tabIndex = isDisabledLike ? -1 : 0
      this.setAttribute('aria-disabled', isDisabledLike ? 'true' : 'false')
    } else if (this._asChildTarget) {
      // Reflect disabled semantics onto the slotted child in as-child mode.
      this._asChildTarget.setAttribute('aria-disabled', isDisabledLike ? 'true' : 'false')
      if (isDisabledLike) {
        this._asChildTarget.setAttribute('tabindex', '-1')
      } else {
        this._asChildTarget.removeAttribute('tabindex')
      }
    }
  }

  //-------------------------------Public API--------------------------------

  focus(options?: FocusOptions): void {
    if (!this._isAsChild) {
      super.focus(options)
    }
  }

  blur(): void {
    if (!this._isAsChild) {
      super.blur()
    }
  }

  click(): void {
    super.click()
  }

  get variant(): UIButtonVariant {
    return this.getAttribute(UI_BUTTON_ATTRIBUTES.VARIANT) as UIButtonVariant
  }

  set variant(value: UIButtonVariant) {
    if (value) this.setAttribute(UI_BUTTON_ATTRIBUTES.VARIANT, value)
    else this.setAttribute(UI_BUTTON_ATTRIBUTES.VARIANT, 'default')
  }

  get size(): UIButtonSize {
    return this.getAttribute(UI_BUTTON_ATTRIBUTES.SIZE) as UIButtonSize
  }

  set size(value: UIButtonSize) {
    if (value) this.setAttribute(UI_BUTTON_ATTRIBUTES.SIZE, value)
    else this.setAttribute(UI_BUTTON_ATTRIBUTES.SIZE, 'default')
  }

  get disabled(): boolean {
    return this.hasAttribute(UI_BUTTON_ATTRIBUTES.DISABLED) || this.loading
  }

  set disabled(value: boolean) {
    const currentlyDisabledAttr = this.hasAttribute(UI_BUTTON_ATTRIBUTES.DISABLED)
    if (value === currentlyDisabledAttr) return
    if (value) {
      this.setAttribute(UI_BUTTON_ATTRIBUTES.DISABLED, '')
    } else {
      this.removeAttribute(UI_BUTTON_ATTRIBUTES.DISABLED)
    }
  }

  get type(): HTMLButtonElement['type'] {
    return (this.getAttribute(UI_BUTTON_ATTRIBUTES.TYPE) as HTMLButtonElement['type']) ?? 'button'
  }

  set type(value: HTMLButtonElement['type']) {
    if (value === 'submit' || value === 'reset' || value === 'button')
      this.setAttribute(UI_BUTTON_ATTRIBUTES.TYPE, value)
    else this.removeAttribute(UI_BUTTON_ATTRIBUTES.TYPE)
  }

  get name(): string | null {
    return this.getAttribute(UI_BUTTON_ATTRIBUTES.NAME)
  }

  set name(value: string | null) {
    if (value === null) this.removeAttribute(UI_BUTTON_ATTRIBUTES.NAME)
    else this.setAttribute(UI_BUTTON_ATTRIBUTES.NAME, value)
  }

  get value(): string | null {
    return this.getAttribute(UI_BUTTON_ATTRIBUTES.VALUE)
  }

  set value(value: string | null) {
    if (value === null) this.removeAttribute(UI_BUTTON_ATTRIBUTES.VALUE)
    else this.setAttribute(UI_BUTTON_ATTRIBUTES.VALUE, value)
  }

  get loading(): boolean {
    return this.hasAttribute(UI_BUTTON_ATTRIBUTES.LOADING)
  }

  set loading(value: boolean) {
    const currentlyLoading = this.hasAttribute(UI_BUTTON_ATTRIBUTES.LOADING)
    if (value === currentlyLoading) return
    if (value) this.setAttribute(UI_BUTTON_ATTRIBUTES.LOADING, '')
    else this.removeAttribute(UI_BUTTON_ATTRIBUTES.LOADING)
  }

  get toggle(): boolean {
    return this.hasAttribute(UI_BUTTON_ATTRIBUTES.TOGGLE)
  }

  set toggle(value: boolean) {
    if (value) this.setAttribute(UI_BUTTON_ATTRIBUTES.TOGGLE, '')
    else this.removeAttribute(UI_BUTTON_ATTRIBUTES.TOGGLE)
  }

  get pressed(): boolean {
    return this.hasAttribute(UI_BUTTON_ATTRIBUTES.PRESSED)
  }

  set pressed(value: boolean) {
    if (value) this.setAttribute(UI_BUTTON_ATTRIBUTES.PRESSED, '')
    else this.removeAttribute(UI_BUTTON_ATTRIBUTES.PRESSED)
  }

  /**
   * When as-child is enabled, merge relevant host attributes onto the
   * slotted child and make the host itself non-interactive, so that
   * the child (e.g. <a>) becomes the real interactive element.
   */
  private _applyAsChildBehavior(): void {
    if (!this._asChildTarget || this._asChildTarget === this) return

    // Merge public-facing attributes from host to child. Exclude internal
    // control attributes that either don't apply or are handled separately.
    mergeHostAttributesToTarget(this, this._asChildTarget, {
      exclude: [
        'as-child',
        UI_BUTTON_ATTRIBUTES.VARIANT,
        UI_BUTTON_ATTRIBUTES.SIZE,
        UI_BUTTON_ATTRIBUTES.BLOCK,
        UI_BUTTON_ATTRIBUTES.DISABLED,
        UI_BUTTON_ATTRIBUTES.LOADING,
        UI_BUTTON_ATTRIBUTES.TOGGLE,
        UI_BUTTON_ATTRIBUTES.PRESSED,
        UI_BUTTON_ATTRIBUTES.TYPE,
        UI_BUTTON_ATTRIBUTES.NAME,
        UI_BUTTON_ATTRIBUTES.VALUE,
        'role',
        'tabindex'
      ],
      clearFromHost: false
    })

    // Ensure the host itself does not appear interactive when as-child is
    // active; the child element carries the interactive semantics.
    this.removeAttribute('role')
    this.tabIndex = -1
  }
}

if (!customElements.get(UI_BUTTON_TAG_NAME)) {
  customElements.define(UI_BUTTON_TAG_NAME, UiButton)
}

declare global {
  interface HTMLElementTagNameMap {
    [UI_BUTTON_TAG_NAME]: UiButton
  }
}
