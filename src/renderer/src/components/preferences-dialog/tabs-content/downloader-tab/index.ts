import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIInput, UISelect, UIButton } from '@renderer/components/ui'
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
  private changeYtdlpConfigPathButton: UIButton | null = null
  private ytdlpConfigPathDisplay: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    this._render()
    this._cacheRefs()
    this.config = await window.api?.config.getConfig()
    this.applyI18n()
    this._syncYtdlpConfigPath()
    this._changeYtdlpConfigPath()
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
    this.changeYtdlpConfigPathButton =
      this.shadowRoot?.querySelector<UIButton>('#change-ytdlp-config-path-button') ?? null
    this.ytdlpConfigPathDisplay =
      this.shadowRoot?.querySelector<HTMLElement>('#ytdlp-config-path-display') ?? null
  }

  private _syncYtdlpConfigPath(location?: string): void {
    if (!this.ytdlpConfigPathDisplay) return
    const path = location ?? this.config?.downloader.configPath ?? ''
    this.ytdlpConfigPathDisplay.textContent = path
    this.ytdlpConfigPathDisplay.setAttribute('title', path)
  }

  private _changeYtdlpConfigPath(): void {
    if (!this.changeYtdlpConfigPathButton) return
    this.changeYtdlpConfigPathButton.addEventListener('click', () => {
      window.api?.downloadsPreferences.changeYtdlpConfigPath()
    })
    window.api?.downloadsPreferences.changedYtdlpConfigPath((location: string | string[]) => {
      this._syncYtdlpConfigPath(Array.isArray(location) ? (location[0] ?? '') : location)
    })
  }

  private applyI18n(): void {
    if (!this.shadowRoot) return

    // text content translations
    this.shadowRoot.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = this.t(el.getAttribute('data-i18n') as string)
    })
    // placeholder translations
    this.shadowRoot.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder')
      if (key) el.setAttribute('placeholder', this.t(key))
    })

    // aria-label translations
    this.shadowRoot.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label')
      if (key) el.setAttribute('aria-label', this.t(key))
    })
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
      return `<ui-option value="${cookie.value}">${cookie.label.toLowerCase() === 'none' ? this.t('pref.downloader.cookiesFromBrowser.options.none') : cookie.label}</ui-option>`
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
