import template from './template.html?raw'
import styleCss from './style.css?inline'
import { AppConfig } from '@root/shared/types'
import { UIButton, UISelect, UIInput } from '@renderer/components/ui'
import { DATA } from '@root/shared/data'

export class DownloadsTab extends HTMLElement {
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
  private t = window.api?.i18n?.t || (() => '')
  private config: AppConfig | null = null

  // refs
  private downloadPathDisplay: HTMLElement | null = null
  private maxDownloadsDisplay: HTMLElement | null = null
  private maxDownloadsControls: HTMLElement | null = null
  private videoQualitySelect: UISelect | null = null
  private audioQualitySelect: UISelect | null = null
  private videoCodecSelect: UISelect | null = null
  private folderNameFormatPlaylistsInput: UIInput | null = null
  private fileNameFormatPlaylistsInput: UIInput | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    this._render()
    this._cacheRefs()
    this.config = (await window.api?.config.getConfig()) || null
    this.applyI18n()
    this.setupListeners()
    this.syncDownloadPath()
    this.changeDownloadPath()
    this.syncMaxDownloads()
    this.changeMaxDownloads()
    this.syncVideoQuality()
    this.changeVideoQuality()
    this.syncAudioQuality()
    this.changeAudioQuality()
    this.syncVideoCodec()
    this.changeVideoCodec()
    this.syncFolderNameFormatPlaylists()
    this.changeFolderNameFormatPlaylists()
    this.resetFolderNameFormatPlaylists()
    this.syncFileNameFormatPlaylists()
    this.changeFileNameFormatPlaylists()
    this.resetFileNameFormatPlaylists()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [DownloadsTab.sheet]
    // append cached template content
    this.shadowRoot.append(DownloadsTab.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    this.downloadPathDisplay =
      this.shadowRoot?.querySelector<HTMLElement>('#download-path-display') || null
    this.maxDownloadsDisplay =
      this.shadowRoot?.querySelector<HTMLElement>('#max-downloads-display') || null
    this.maxDownloadsControls =
      this.shadowRoot?.querySelector<HTMLElement>('#max-downloads-controls') || null
    this.videoQualitySelect =
      this.shadowRoot?.querySelector<UISelect>('#video-quality-select') || null
    this.audioQualitySelect =
      this.shadowRoot?.querySelector<UISelect>('#audio-quality-select') || null
    this.videoCodecSelect = this.shadowRoot?.querySelector<UISelect>('#video-codec-select') || null
    this.folderNameFormatPlaylistsInput =
      this.shadowRoot?.querySelector<UIInput>('#folder-name-format-playlists-input') || null
    this.fileNameFormatPlaylistsInput =
      this.shadowRoot?.querySelector<UIInput>('#file-name-format-playlists-input') || null
  }

  private applyI18n(): void {
    this.shadowRoot?.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n') || ''
      if (!key) return
      el.textContent = this.t(key)
    })

    if (this.videoQualitySelect)
      this.videoQualitySelect.setAttribute(
        'placeholder',
        this.t('pref.downloads.videoQuality.placeholder')
      )

    if (this.videoCodecSelect)
      this.videoCodecSelect.setAttribute(
        'placeholder',
        this.t('pref.downloads.videoCodec.placeholder')
      )

    if (this.audioQualitySelect)
      this.audioQualitySelect.setAttribute(
        'placeholder',
        this.t('pref.downloads.audioQuality.placeholder')
      )
  }

  private setupListeners(): void {
    window.api?.downloadsPreferences?.changedDownloadPath((location: string | string[]) => {
      this.handleChangedDownloadPath(location)
    })
  }

  private handleChangedDownloadPath(location: string | string[]): void {
    if (!this.downloadPathDisplay) return
    const path = Array.isArray(location) ? (location[0] ?? '') : location
    if (!path) return
    this.downloadPathDisplay.textContent = path
    this.downloadPathDisplay.setAttribute('title', path)
  }

  private async syncDownloadPath(): Promise<void> {
    if (!this.downloadPathDisplay) return
    try {
      const downloadPathFromMain = this.config?.downloads.downloadDir ?? null
      if (downloadPathFromMain) {
        this.downloadPathDisplay.textContent = downloadPathFromMain
        this.downloadPathDisplay.setAttribute('title', downloadPathFromMain)
      }
    } catch {
      // ignore
    }
  }

  private changeDownloadPath(): void {
    const button = this.shadowRoot?.querySelector<UIButton>('#change-download-path-button') || null
    if (!button) return
    button.addEventListener('click', () => {
      window.api?.downloadsPreferences?.changeDownloadPath()
    })
  }

  private syncMaxDownloads(): void {
    if (!this.maxDownloadsDisplay) return
    const maxDownloads = this.config?.downloads.maxDownloads ?? 5
    this.maxDownloadsDisplay.textContent = maxDownloads.toString()
    this.maxDownloadsDisplay.setAttribute('title', maxDownloads.toString())
  }

  private changeMaxDownloads(): void {
    const buttons = this.maxDownloadsControls?.querySelectorAll<UIButton>('ui-button') || []
    if (!buttons.length) return
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        if (!this.maxDownloadsDisplay) return
        const value = parseInt(this.maxDownloadsDisplay.textContent || '5', 10)
        const isDecrement = button.getAttribute('data-action') === 'decrement'
        let next = isDecrement ? value - 1 : value + 1
        if (next <= 0) next = 1
        this.maxDownloadsDisplay.textContent = next.toString()
        this.maxDownloadsDisplay.setAttribute('title', next.toString())
        window.api?.config?.updateConfig({ downloads: { maxDownloads: next } }).catch(() => {})
      })
    })
  }

  private syncVideoQuality(): void {
    if (!this.videoQualitySelect) return
    const options = DATA.videoQualities.map((quality) => {
      return `<ui-option value="${quality.value}">${quality.label}</ui-option>`
    })
    this.videoQualitySelect.innerHTML = options.join('')
    const saved = this.config?.downloads.videoQuality
    if (saved) {
      this.videoQualitySelect.setAttribute('value', saved)
    }
  }

  private changeVideoQuality(): void {
    if (!this.videoQualitySelect) return
    this.videoQualitySelect.addEventListener('change', (e) => {
      const select = e.target as UISelect
      const value = select.value
      if (!value) return
      window.api?.config?.updateConfig({ downloads: { videoQuality: value } }).catch(() => {})
    })
  }

  private syncAudioQuality(): void {
    if (!this.audioQualitySelect) return
    const options = DATA.audioQualities.map((quality) => {
      return `<ui-option value="${quality.value}">${quality.label}</ui-option>`
    })
    this.audioQualitySelect.innerHTML = options.join('')
    const saved = this.config?.downloads.audioQuality
    if (saved) {
      this.audioQualitySelect.setAttribute('value', saved)
    }
  }

  private changeAudioQuality(): void {
    if (!this.audioQualitySelect) return
    this.audioQualitySelect.addEventListener('change', (e) => {
      const select = e.target as UISelect
      const value = select.value
      if (!value) return
      window.api?.config?.updateConfig({ downloads: { audioQuality: value } }).catch(() => {})
    })
  }

  private syncVideoCodec(): void {
    if (!this.videoCodecSelect) return
    const options = DATA.videoCodecs.map((codec) => {
      return `<ui-option value="${codec.value}">${codec.label}</ui-option>`
    })
    this.videoCodecSelect.innerHTML = options.join('')
    const saved = this.config?.downloads.videoCodec
    if (saved) {
      this.videoCodecSelect.setAttribute('value', saved)
    }
  }

  private changeVideoCodec(): void {
    if (!this.videoCodecSelect) return
    this.videoCodecSelect.addEventListener('change', (e) => {
      const select = e.target as UISelect
      const value = select.value
      if (!value) return
      window.api?.config?.updateConfig({ downloads: { videoCodec: value } }).catch(() => {})
    })
  }

  private syncFolderNameFormatPlaylists(): void {
    if (!this.folderNameFormatPlaylistsInput) return
    const saved = this.config?.downloads.folderNameFormatPlaylists
    if (saved) {
      this.folderNameFormatPlaylistsInput.setAttribute('value', saved)
    }
  }

  private changeFolderNameFormatPlaylists(): void {
    if (!this.folderNameFormatPlaylistsInput) return
    this.folderNameFormatPlaylistsInput.addEventListener('input', (e) => {
      const input = e.target as UIInput
      const value = input.value
      if (!value) return
      window.api?.config
        ?.updateConfig({ downloads: { folderNameFormatPlaylists: value } })
        .catch(() => {})
    })
  }

  private resetFolderNameFormatPlaylists(): void {
    const resetButton = this.shadowRoot?.querySelector<UIButton>(
      '[data-action="reset-folder-name"]'
    )
    if (!this.folderNameFormatPlaylistsInput || !resetButton) return
    resetButton.addEventListener('click', async () => {
      const defaultConfig = await window.api?.config?.getAppDefaults()
      if (!defaultConfig) return
      const folderNameFormatPlaylists = defaultConfig.downloads.folderNameFormatPlaylists
      this.folderNameFormatPlaylistsInput?.setAttribute('value', folderNameFormatPlaylists)
      window.api?.config
        ?.updateConfig({
          downloads: { folderNameFormatPlaylists }
        })
        .catch(() => {})
    })
  }

  private syncFileNameFormatPlaylists(): void {
    if (!this.fileNameFormatPlaylistsInput) return
    const saved = this.config?.downloads.fileNameFormatPlaylists
    if (!saved) return
    this.fileNameFormatPlaylistsInput.setAttribute('value', saved)
  }

  private changeFileNameFormatPlaylists(): void {
    if (!this.fileNameFormatPlaylistsInput) return
    this.fileNameFormatPlaylistsInput.addEventListener('change', (e) => {
      const input = e.target as UIInput
      const value = input.value
      if (!value) return
      window.api?.config
        ?.updateConfig({ downloads: { fileNameFormatPlaylists: value } })
        .catch(() => {})
    })
  }

  private resetFileNameFormatPlaylists(): void {
    const resetButton = this.shadowRoot?.querySelector<UIButton>('[data-action="reset-file-name"]')
    if (!this.fileNameFormatPlaylistsInput || !resetButton) return
    resetButton.addEventListener('click', async () => {
      const defaultConfig = await window.api?.config?.getAppDefaults()
      if (!defaultConfig) return
      const fileNameFormatPlaylists = defaultConfig.downloads.fileNameFormatPlaylists
      this.fileNameFormatPlaylistsInput?.setAttribute('value', fileNameFormatPlaylists)
      window.api?.config
        ?.updateConfig({
          downloads: { fileNameFormatPlaylists }
        })
        .catch(() => {})
    })
  }
}
if (!customElements.get('downloads-tab-content')) {
  customElements.define('downloads-tab-content', DownloadsTab)
}

declare global {
  interface HTMLElementTagNameMap {
    'downloads-tab-content': DownloadsTab
  }
}
