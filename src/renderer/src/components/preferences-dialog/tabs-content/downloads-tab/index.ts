import '../../../area-article/index'
import '../../../area-section/index'
import html from './template.html?raw'
import style from './style.css?inline'
import { DATA } from '@root/shared/data'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { AppConfig } from '@root/shared/ipc/app-config'
import { UIInputValueDetail, type UiInput } from '@ui/input/ui-input'
import { type UiButton } from '@ui/button/ui-button'
import { type UiSelect } from '@ui/select/ui-select'
import { type ValueChangeEventDetail } from '@ui/select/constants'
import { type UiSelectContent } from '@ui/select/ui-select-content'
import { ChangePathsStatusBusEvent } from '@root/shared/ipc/user-pref'
import { localizeElementsText } from '@renderer/lib/ui/localize'

const DOWNLOADS_TAB_TAG_NAME = 'downloads-tab-content'

export class DownloadsTabContent extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // states
  private config: AppConfig | null = null
  private _changedDownloadPathUnsub: (() => void) | null = null
  private _eventsAborter: null | AbortController = null
  // refs
  private downloadPathDisplay: HTMLElement | null = null
  private maxDownloadsDisplay: HTMLElement | null = null
  private maxDownloadsControls: HTMLElement | null = null
  private videoQualitySelect: UiSelect | null = null
  private videoQualitySelectContent: UiSelectContent | null = null
  private audioQualitySelect: UiSelect | null = null
  private audioQualitySelectContent: UiSelectContent | null = null
  private videoCodecSelect: UiSelect | null = null
  private videoCodecSelectContent: UiSelectContent | null = null
  private folderNameFormatPlaylistsInput: UiInput | null = null
  private fileNameFormatPlaylistsInput: UiInput | null = null

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
    const config = (await window.api.config.getConfig()) || null
    this.config = config ? JSON.parse(JSON.stringify(config)) : null
    this._syncDownloadPath()
    this._changeDownloadPath()
    this._syncMaxDownloads()
    this._changeMaxDownloads()
    this._syncVideoQuality()
    this._changeVideoQuality()
    this._syncAudioQuality()
    this._changeAudioQuality()
    this._syncVideoCodec()
    this._changeVideoCodec()
    this._syncFolderNameFormatPlaylists()
    this._changeFolderNameFormatPlaylists()
    this._resetFolderNameFormatPlaylists()
    this._syncFileNameFormatPlaylists()
    this._changeFileNameFormatPlaylists()
    this._resetFileNameFormatPlaylists()
    this._setupListeners()
    localizeElementsText(this.shadowRoot as ShadowRoot)
  }

  disconnectedCallback(): void {
    this._changedDownloadPathUnsub?.()
    this._changedDownloadPathUnsub = null
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [DownloadsTabContent.sheet]
    this.shadowRoot.append(DownloadsTabContent.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    this.downloadPathDisplay =
      this.shadowRoot?.querySelector<HTMLElement>('[data-el="download-path-display"]') || null
    this.maxDownloadsDisplay =
      this.shadowRoot?.querySelector<HTMLElement>('[data-el="max-downloads-display"]') || null
    this.maxDownloadsControls =
      this.shadowRoot?.querySelector<HTMLElement>('[data-el="max-downloads-controls"]') || null
    this.videoQualitySelect =
      this.shadowRoot?.querySelector<UiSelect>('[data-el="video-quality-select"]') || null
    this.videoQualitySelectContent =
      this.shadowRoot?.querySelector<UiSelectContent>('[data-el="video-quality-select-content"]') ||
      null
    this.audioQualitySelect =
      this.shadowRoot?.querySelector<UiSelect>('[data-el="audio-quality-select"]') || null
    this.audioQualitySelectContent =
      this.shadowRoot?.querySelector<UiSelectContent>('[data-el="audio-quality-select-content"]') ||
      null
    this.videoCodecSelect =
      this.shadowRoot?.querySelector<UiSelect>('[data-el="video-codec-select"]') || null
    this.videoCodecSelectContent =
      this.shadowRoot?.querySelector<UiSelectContent>('[data-el="video-codec-select-content"]') ||
      null
    this.folderNameFormatPlaylistsInput =
      this.shadowRoot?.querySelector<UiInput>('[data-el="folder-name-format-playlists-input"]') ||
      null
    this.fileNameFormatPlaylistsInput =
      this.shadowRoot?.querySelector<UiInput>('[data-el="file-name-format-playlists-input"]') ||
      null
  }

  private _setupListeners(): void {
    this._changedDownloadPathUnsub = window.api.preferences.downloadPath.changedGlobal(
      (payload: ChangePathsStatusBusEvent) => {
        if (payload.status === 'success') {
          this._handleChangedDownloadPath(payload.payload.path)
        }
      }
    )
  }

  private _handleChangedDownloadPath(location: string | string[]): void {
    if (!this.downloadPathDisplay) return
    const path = Array.isArray(location) ? (location[0] ?? '') : location
    if (!path) return
    this.downloadPathDisplay.textContent = path
  }

  private _syncDownloadPath(): void {
    if (!this.downloadPathDisplay) return
    const downloadPathFromMain = this.config?.downloads.downloadDir ?? null
    if (downloadPathFromMain) {
      this.downloadPathDisplay.textContent = downloadPathFromMain
    }
  }

  private _changeDownloadPath(): void {
    const button =
      this.shadowRoot?.querySelector<UiButton>('[data-el="change-download-path-btn"]') || null
    if (!button || !this._eventsAborter) return

    button.addEventListener(
      'click',
      () => {
        window.api.preferences.downloadPath.changeGlobal()
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncMaxDownloads(): void {
    if (!this.maxDownloadsDisplay) return
    const maxDownloads = this.config?.downloads.maxDownloads ?? 5
    this.maxDownloadsDisplay.textContent = maxDownloads.toString()
  }

  private _changeMaxDownloads(): void {
    const buttons = this.maxDownloadsControls?.querySelectorAll<UiButton>('ui-button')
    if (!buttons?.length || !this._eventsAborter) return

    buttons.forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          if (!this.maxDownloadsDisplay) return
          const value = parseInt(this.maxDownloadsDisplay.textContent || '5', 10)
          const isDecrement = button.getAttribute('data-action') === 'decrement'
          let next = isDecrement ? value - 1 : value + 1
          if (next <= 0) next = 1
          this.maxDownloadsDisplay.textContent = next.toString()
          window.api.config.updateConfig({ downloads: { maxDownloads: next } }).catch(() => {})
        },
        { signal: this._eventsAborter?.signal }
      )
    })
  }

  private _syncVideoQuality(): void {
    if (!this.videoQualitySelect || !this.videoQualitySelectContent) return
    const options = DATA.videoQualities.map((quality) => {
      return `<ui-select-option value="${quality.value}">${quality.label}</ui-select-option>`
    })
    this.videoQualitySelectContent.innerHTML = options.join('')
    const saved = this.config?.downloads.videoQuality
    if (saved) {
      this.videoQualitySelect.value = saved
    }
  }

  private _changeVideoQuality(): void {
    if (!this.videoQualitySelect || !this._eventsAborter) return
    this.videoQualitySelect.addEventListener(
      'change',
      (e) => {
        const detail = (e as CustomEvent<ValueChangeEventDetail>).detail
        const value = detail.value
        if (!value) return
        window.api.config.updateConfig({ downloads: { videoQuality: value } }).catch(() => {})
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncAudioQuality(): void {
    if (!this.audioQualitySelect || !this.audioQualitySelectContent) return
    const options = DATA.audioQualities.map((quality) => {
      return `<ui-select-option value="${quality.value}">${quality.label}</ui-select-option>`
    })
    this.audioQualitySelectContent.innerHTML = options.join('')
    const saved = this.config?.downloads.audioQuality
    if (saved) {
      this.audioQualitySelect.value = saved
    }
  }

  private _changeAudioQuality(): void {
    if (!this.audioQualitySelect || !this._eventsAborter) return
    this.audioQualitySelect.addEventListener(
      'change',
      (e) => {
        const detail = (e as CustomEvent<ValueChangeEventDetail>).detail
        const value = detail.value
        if (!value) return
        window.api.config.updateConfig({ downloads: { audioQuality: value } }).catch(() => {})
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncVideoCodec(): void {
    if (!this.videoCodecSelect || !this.videoCodecSelectContent) return
    const options = DATA.videoCodecs.map((codec) => {
      return `<ui-select-option value="${codec.value}">${codec.label}</ui-select-option>`
    })
    this.videoCodecSelectContent.innerHTML = options.join('')
    const saved = this.config?.downloads.videoCodec
    if (saved) {
      this.videoCodecSelect.value = saved
    }
  }

  private _changeVideoCodec(): void {
    if (!this.videoCodecSelect || !this._eventsAborter) return
    this.videoCodecSelect.addEventListener(
      'change',
      (e) => {
        const detail = (e as CustomEvent<ValueChangeEventDetail>).detail
        const value = detail.value
        if (!value) return
        window.api.config.updateConfig({ downloads: { videoCodec: value } }).catch(() => {})
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncFolderNameFormatPlaylists(): void {
    if (!this.folderNameFormatPlaylistsInput) return
    const saved = this.config?.downloads.folderNameFormatPlaylists
    if (saved) {
      this.folderNameFormatPlaylistsInput.value = saved
    }
  }

  private _changeFolderNameFormatPlaylists(): void {
    if (!this.folderNameFormatPlaylistsInput || !this._eventsAborter) return
    this.folderNameFormatPlaylistsInput.addEventListener(
      'input',
      (e) => {
        const detail = (e as CustomEvent<UIInputValueDetail>).detail
        const value = detail.value
        if (!value) return
        window.api.config
          .updateConfig({ downloads: { folderNameFormatPlaylists: value } })
          .catch(() => {})
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _resetFolderNameFormatPlaylists(): void {
    const resetButton = this.shadowRoot?.querySelector<UiButton>(
      '[data-action="reset-folder-name"]'
    )
    if (!this.folderNameFormatPlaylistsInput || !resetButton || !this._eventsAborter) return
    resetButton.addEventListener(
      'click',
      async () => {
        const defaultConfig = await window.api.config.getAppDefaults()
        if (!defaultConfig) return
        const folderNameFormatPlaylists = defaultConfig.downloads.folderNameFormatPlaylists
        if (this.folderNameFormatPlaylistsInput) {
          this.folderNameFormatPlaylistsInput.value = folderNameFormatPlaylists
        }
        window.api.config
          .updateConfig({
            downloads: { folderNameFormatPlaylists }
          })
          .catch(() => {})
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncFileNameFormatPlaylists(): void {
    if (!this.fileNameFormatPlaylistsInput) return
    const saved = this.config?.downloads.fileNameFormatPlaylists
    if (!saved) return
    this.fileNameFormatPlaylistsInput.value = saved
  }

  private _changeFileNameFormatPlaylists(): void {
    if (!this.fileNameFormatPlaylistsInput || !this._eventsAborter) return
    this.fileNameFormatPlaylistsInput.addEventListener(
      'change',
      (e) => {
        const detail = (e as CustomEvent<UIInputValueDetail>).detail
        const value = detail.value
        if (!value) return
        window.api.config
          .updateConfig({ downloads: { fileNameFormatPlaylists: value } })
          .catch(() => {})
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _resetFileNameFormatPlaylists(): void {
    const resetButton = this.shadowRoot?.querySelector<UiButton>('[data-action="reset-file-name"]')
    if (!this.fileNameFormatPlaylistsInput || !resetButton || !this._eventsAborter) return
    resetButton.addEventListener(
      'click',
      async () => {
        const defaultConfig = await window.api.config.getAppDefaults()
        if (!defaultConfig) return
        const fileNameFormatPlaylists = defaultConfig.downloads.fileNameFormatPlaylists
        if (this.fileNameFormatPlaylistsInput) {
          this.fileNameFormatPlaylistsInput.value = fileNameFormatPlaylists
        }
        window.api.config
          .updateConfig({
            downloads: { fileNameFormatPlaylists }
          })
          .catch(() => {})
      },
      { signal: this._eventsAborter.signal }
    )
  }
}
if (!customElements.get(DOWNLOADS_TAB_TAG_NAME)) {
  customElements.define(DOWNLOADS_TAB_TAG_NAME, DownloadsTabContent)
}

declare global {
  interface HTMLElementTagNameMap {
    [DOWNLOADS_TAB_TAG_NAME]: DownloadsTabContent
  }
}
