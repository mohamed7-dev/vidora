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

  constructor() {
    super()

    this.attachShadow({ mode: 'open' })
  }

  private t = window.api?.i18n?.t || (() => '')

  connectedCallback(): void {
    this._render()
    // i18n init and binding
    this.applyI18n()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [PreferencesDialog.sheet]
    // append cached template content
    this.shadowRoot.append(PreferencesDialog.tpl.content.cloneNode(true))
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
    ;(this.shadowRoot?.querySelector('ui-dialog') as UIDialog)?.openDialog()
  }
}

customElements.define('preferences-dialog', PreferencesDialog)
