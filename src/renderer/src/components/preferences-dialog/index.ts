import './tabs-content/general-tab/index'
import './tabs-content/downloader-tab/index'
import './tabs-content/downloads-tab/index'
import html from './template.html?raw'
import style from './style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { type UiDialog } from '@ui/dialog/ui-dialog'
import { OpenChangeEventDetail, UI_DIALOG_EVENTS } from '@ui/dialog/constants'
import { localizeElementsText } from '@renderer/lib/ui/localize'

const PREF_DIALOG_NAME = 'preferences-dialog'

export class PreferencesDialog extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // states
  private _mounted = false
  private _listeners: AbortController | null = null
  // refs
  private _dialogEl: UiDialog | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._renderShell()
    localizeElementsText(this.shadowRoot as ShadowRoot)
  }

  private _renderShell(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [PreferencesDialog.sheet]
  }

  private _mount(): void {
    if (this._mounted || !this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [PreferencesDialog.sheet]
    const frag = PreferencesDialog.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.append(frag)
    this._dialogEl = this.shadowRoot.querySelector('ui-dialog') as UiDialog | null
    this._listeners = new AbortController()
    this._dialogEl?.addEventListener(UI_DIALOG_EVENTS.OPEN_CHANGE, (e) => this._onOpenChange(e), {
      signal: this._listeners.signal
    })
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._mounted = true
  }

  private _onOpenChange(e: Event): void {
    const detail = (e as CustomEvent<OpenChangeEventDetail>)?.detail
    if (!detail.open) {
      this._unmount()
    }
  }

  private _unmount(): void {
    if (!this._mounted) return
    this._listeners?.abort()
    this._listeners = null
    this._dialogEl?.remove()
    this._dialogEl = null
    this._mounted = false
    this._renderShell()
  }

  openDialog(): void {
    this._mount()
    if (this._dialogEl) {
      this._dialogEl.open = true
    }
  }

  close(): void {
    if (this._dialogEl) {
      this._dialogEl.open = false
    }
    this._unmount()
  }
}

if (!customElements.get(PREF_DIALOG_NAME)) {
  customElements.define(PREF_DIALOG_NAME, PreferencesDialog)
}

declare global {
  interface HTMLElementTagNameMap {
    [PREF_DIALOG_NAME]: PreferencesDialog
  }
}
