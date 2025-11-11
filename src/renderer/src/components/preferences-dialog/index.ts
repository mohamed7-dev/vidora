import './tabs-content/general-tab/index'
import './tabs-content/downloader-tab/index'
import './tabs-content/downloads-tab/index'
import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIDialog } from '../ui'

export class PreferencesDialog extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(styleCss)
    return s
  })()
  private static readonly tpl: HTMLTemplateElement = (() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    const inner = doc.querySelector('template')
    const t = document.createElement('template')
    t.innerHTML = inner ? inner.innerHTML : template
    return t
  })()
  // states
  private _mounted = false
  private _listeners: AbortController | null = null
  // refs
  private _dialogEl: UIDialog | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  private t = window.api?.i18n?.t || (() => '')

  connectedCallback(): void {
    this._renderShell()
  }

  private _renderShell(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [PreferencesDialog.sheet]
  }

  private _mount(): void {
    if (this._mounted || !this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [PreferencesDialog.sheet]
    const frag = PreferencesDialog.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.append(frag)
    this._dialogEl = this.shadowRoot.querySelector('ui-dialog') as UIDialog | null
    this._listeners = new AbortController()
    this._dialogEl?.addEventListener(
      'ui-after-hide',
      () => {
        this._unmount()
      },
      { signal: this._listeners.signal }
    )
    this.applyI18n()
    this._mounted = true
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

  private applyI18n(): void {
    const root = this.shadowRoot
    if (!root) return
    const nodes = root.querySelectorAll<HTMLElement>('[data-i18n]')
    nodes.forEach((el) => {
      const key = el.getAttribute('data-i18n') || ''
      if (!key) return
      el.textContent = this.t(key)
    })
  }

  openDialog(): void {
    this._mount()
    this._dialogEl?.openDialog()
  }

  close(): void {
    if (this._dialogEl) this._dialogEl.close()
    this._unmount()
  }
}

customElements.define('preferences-dialog', PreferencesDialog)
