import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIInput, UISelect } from '@renderer/components/ui'
import { DATA } from '@root/shared/data'
import { AppConfig } from '@root/shared/types'

export class DownloaderTab extends HTMLElement {
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
  private config: AppConfig | null = null
  private t = window.api?.i18n?.t ?? ((key: string) => key)

  //refs
  private cookiesFromBrowserSelect: UISelect | null = null
  private proxyServerInput: UIInput | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    this._render()
    this._cacheRefs()
    this.config = (await window.api?.config.getConfig()) || null
    this.applyI18n()
    this.syncCookiesFromBrowserSelect()
    this.changeProxyServerInput()
    this.syncProxyServerInput()
    this.changeCookiesFromBrowserSelect()
    this.syncCookiesFromBrowserSelect()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [DownloaderTab.sheet]
    // append cached template content
    this.shadowRoot.append(DownloaderTab.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    this.cookiesFromBrowserSelect =
      this.shadowRoot?.querySelector<UISelect>('#cookies-from-browser-select') ?? null
    this.proxyServerInput = this.shadowRoot?.querySelector<UIInput>('#proxy-server-input') ?? null
  }

  private applyI18n(): void {
    this.shadowRoot?.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = this.t(el.getAttribute('data-i18n') as string)
    })
    if (this.cookiesFromBrowserSelect)
      this.cookiesFromBrowserSelect.setAttribute(
        'placeholder',
        this.t('pref.downloader.cookiesFromBrowser.placeholder')
      )
  }

  private changeProxyServerInput(): void {
    if (!this.proxyServerInput) return
    this.proxyServerInput.addEventListener('input', (e) => {
      const value = (e.target as UIInput).value
      if (!value) return
      window.api.config.updateConfig({ downloader: { proxyServerUrl: value } })
    })
  }

  private syncProxyServerInput(): void {
    if (!this.proxyServerInput) return
    // this.proxyServerInput.pattern = DATA.config.proxyServerPattern
    const saved = this.config?.downloader.proxyServerUrl
    if (!saved) return
    this.proxyServerInput.setAttribute('value', saved)
  }

  private changeCookiesFromBrowserSelect(): void {
    if (!this.cookiesFromBrowserSelect) return
    this.cookiesFromBrowserSelect.addEventListener('change', (e) => {
      const value = (e.target as UISelect).value
      if (!value) return
      this.cookiesFromBrowserSelect?.setAttribute('value', value)
      window.api.config.updateConfig({ downloader: { cookiesFromBrowser: value } })
    })
  }
  private syncCookiesFromBrowserSelect(): void {
    if (!this.cookiesFromBrowserSelect) return
    const options = DATA.cookiesFromBrowser.map((cookie) => {
      return `<ui-option value="${cookie.value}">${cookie.label}</ui-option>`
    })
    this.cookiesFromBrowserSelect.innerHTML = options.join('')
    this.cookiesFromBrowserSelect.value = this.config?.downloader.cookiesFromBrowser ?? ''
  }
}
if (!customElements.get('downloader-tab-content'))
  customElements.define('downloader-tab-content', DownloaderTab)

declare global {
  interface HTMLElementTagNameMap {
    'downloader-tab-content': DownloaderTab
  }
}
