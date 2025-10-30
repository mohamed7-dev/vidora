import template from './template.html?raw'
import styleCss from './style.css?inline'

export class DownloadingPage extends HTMLElement {
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

  //states
  private _t = window.api.i18n?.t ?? (() => '')
  private _unsub: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._applyI18n()
    void this._load()
    this._bindUpdates()
  }

  disconnectedCallback(): void {
    if (this._unsub) this._unsub()
    this._unsub = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [DownloadingPage.sheet]
    this.shadowRoot.append(DownloadingPage.tpl.content.cloneNode(true))
  }

  private async _load(): Promise<void> {
    const all = await window.api.jobs.list()
    const nonQueued = (all || []).filter((j) => j.status !== 'queued')
    this._setJson(nonQueued)
  }

  private _bindUpdates(): void {
    this._unsub = window.api.jobs.onUpdated(() => {
      void this._load()
    })
  }

  private _setJson(v: unknown): void {
    const pre = this.shadowRoot?.querySelector<HTMLPreElement>('#jobs-json')
    if (!pre) return
    try {
      pre.textContent = JSON.stringify(v, null, 2)
    } catch {
      pre.textContent = String(v)
    }
  }

  private _applyI18n(): void {
    const elements = this.shadowRoot?.querySelectorAll('[data-i18n]')
    if (!elements) return
    elements.forEach((e) => {
      const key = e.getAttribute('data-i18n')
      if (!key) return
      e.textContent = this._t(key)
    })
  }
}
if (!customElements.get('downloading-page')) {
  customElements.define('downloading-page', DownloadingPage)
}
declare global {
  interface HTMLElementTagNameMap {
    'downloading-page': DownloadingPage
  }
}
