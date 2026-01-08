import '../../../area-article/index'
import '../../../area-section/index'
import html from './template.html?raw'
import style from './style.css?inline'
import { DATA } from '@root/shared/data'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { AppConfig } from '@root/shared/ipc/app-config'
import { type UiSelect } from '@ui/select/ui-select'
import { type ValueChangeEventDetail } from '@ui/select/constants'
import { type UiSelectContent } from '@ui/select/ui-select-content'
import { type UiInput, type UIInputValueDetail } from '@ui/input/ui-input'
import { type UiButton } from '@ui/button/ui-button'
import { ChangePathsStatusBusEvent } from '@root/shared/ipc/user-pref'
import { localizeElementsText } from '@renderer/lib/ui/localize'

const DOWNLOADER_TAB_TAG_NAME = 'downloader-tab-content'

export class DownloaderTabContent extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // states
  private config: AppConfig | null = null
  private t = window.api.i18n.t
  private _ytdlpPathChangedUnsub: null | (() => void) = null
  private _eventsAborter: null | AbortController = null
  //refs
  private cookiesFromBrowserSelect: UiSelect | null = null
  private cookiesFromBrowserSelectContent: UiSelectContent | null = null
  private proxyServerInput: UiInput | null = null
  private changeYtdlpConfigPathButton: UiButton | null = null
  private ytdlpConfigPathDisplay: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    if (!this._eventsAborter) {
      this._eventsAborter = new AbortController()
    }
    this._render()
    this._cacheRefs()
    const config = await window.api?.config.getConfig()
    this.config = config ? JSON.parse(JSON.stringify(config)) : null
    // this.applyI18n()
    this._syncYtdlpConfigPath()
    this._changeYtdlpConfigPath()
    this._syncCookiesFromBrowserSelect()
    this._syncProxyServerInput()
    this._changeProxyServerInput()
    this._syncCookiesFromBrowserSelect()
    this._changeCookiesFromBrowserSelect()
    localizeElementsText(this.shadowRoot as ShadowRoot)
  }

  disconnectedCallback(): void {
    this._ytdlpPathChangedUnsub?.()
    this._ytdlpPathChangedUnsub = null
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [DownloaderTabContent.sheet]
    this.shadowRoot.append(DownloaderTabContent.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    this.cookiesFromBrowserSelect =
      this.shadowRoot?.querySelector<UiSelect>('[data-el="cookies-from-browser-select"]') ?? null
    this.cookiesFromBrowserSelectContent =
      this.shadowRoot?.querySelector<UiSelectContent>(
        '[data-el="cookies-from-browser-select-content"]'
      ) ?? null
    this.proxyServerInput =
      this.shadowRoot?.querySelector<UiInput>('[data-el="proxy-server-input"]') ?? null
    this.changeYtdlpConfigPathButton =
      this.shadowRoot?.querySelector<UiButton>('[data-el="change-ytdlp-config-path-btn"]') ?? null
    this.ytdlpConfigPathDisplay =
      this.shadowRoot?.querySelector<HTMLElement>('[data-el="ytdlp-config-path-display"]') ?? null
  }

  private _syncYtdlpConfigPath(location?: string): void {
    if (!this.ytdlpConfigPathDisplay) return
    const path = location ?? this.config?.downloader.configPath ?? ''
    this.ytdlpConfigPathDisplay.textContent = path
  }

  private _changeYtdlpConfigPath(): void {
    if (!this.changeYtdlpConfigPathButton || !this._eventsAborter) return
    this.changeYtdlpConfigPathButton.addEventListener(
      'click',
      () => {
        window.api.preferences.ytdlpConfigPath.change()
      },
      { signal: this._eventsAborter?.signal }
    )
    this._ytdlpPathChangedUnsub = window.api.preferences.ytdlpConfigPath.changed(
      (payload: ChangePathsStatusBusEvent) => {
        this._syncYtdlpConfigPath(
          Array.isArray(payload.path) ? (payload.path[0] ?? '') : payload.path
        )
      }
    )
  }

  private _changeProxyServerInput(): void {
    if (!this.proxyServerInput || !this._eventsAborter) return
    this.proxyServerInput.addEventListener(
      'input',
      (e) => {
        const detail = (e as CustomEvent<UIInputValueDetail>).detail
        if (!detail.value) return
        window.api.config.updateConfig({ downloader: { proxyServerUrl: detail.value } })
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncProxyServerInput(): void {
    if (!this.proxyServerInput) return
    // this.proxyServerInput.pattern = DATA.config.proxyServerPattern
    const saved = this.config?.downloader.proxyServerUrl
    if (!saved) return
    this.proxyServerInput.value = saved
  }

  private _changeCookiesFromBrowserSelect(): void {
    if (!this.cookiesFromBrowserSelect || !this._eventsAborter) return
    this.cookiesFromBrowserSelect.addEventListener(
      'change',
      (e) => {
        const detail = (e as CustomEvent<ValueChangeEventDetail>).detail
        if (!detail.value) return
        if (this.cookiesFromBrowserSelect) {
          this.cookiesFromBrowserSelect.value = detail.value
        }
        window.api.config.updateConfig({ downloader: { cookiesFromBrowser: detail.value } })
      },
      { signal: this._eventsAborter.signal }
    )
  }
  private _syncCookiesFromBrowserSelect(): void {
    if (!this.cookiesFromBrowserSelect || !this.cookiesFromBrowserSelectContent) return
    const options = DATA.cookiesFromBrowser.map((cookie) => {
      return `<ui-select-option value="${cookie.value}">${cookie.label.toLowerCase() === 'none' ? this.t`None` : cookie.label}</ui-select-option>`
    })
    this.cookiesFromBrowserSelectContent.innerHTML = options.join('')
    this.cookiesFromBrowserSelect.value = this.config?.downloader.cookiesFromBrowser ?? ''
  }
}
if (!customElements.get(DOWNLOADER_TAB_TAG_NAME))
  customElements.define(DOWNLOADER_TAB_TAG_NAME, DownloaderTabContent)

declare global {
  interface HTMLElementTagNameMap {
    [DOWNLOADER_TAB_TAG_NAME]: DownloaderTabContent
  }
}
