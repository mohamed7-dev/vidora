import template from './template.html?raw'
import styleCss from '../shared.css?inline'
import { UIInput, UISelect } from '@renderer/components/ui'
import { DATA } from '@root/shared/data'
import { AppConfig } from '@root/shared/types'

export class DownloaderTab extends HTMLElement {
  private config: AppConfig | null = null
  private cookiesFromBrowserSelect: UISelect | null = null
  private proxyServerInput: UIInput | null = null
  private t = window.api?.i18n?.t ?? ((key: string) => key)
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    this.render()
    this.config = (await window.api?.config.getConfig()) || null
    this.applyI18n()
    this.syncCookiesFromBrowserSelect()
    this.changeProxyServerInput()
    this.syncProxyServerInput()
    this.changeCookiesFromBrowserSelect()
    this.syncCookiesFromBrowserSelect()
  }

  private render(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('#downloader-tab-template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = styleCss
    this.shadowRoot?.append(style, content)

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

customElements.define('downloader-tab-content', DownloaderTab)
