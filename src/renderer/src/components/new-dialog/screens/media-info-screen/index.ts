import '../../../area-section/index'
import '../../../area-article/index'
import html from './template.html?raw'
import style from './style.css?inline'
import { MediaInfoProcessor, type Preferences, type VideoOption, type AudioOption } from './formats'
import type { UIInput } from '../../../ui/input/index'
import { DownloadProcessor } from './download'
import { UIButton, UICheckbox, UISelect } from '@renderer/components/ui'
import {
  createStyleSheetFromStyle,
  createTemplateFromHtml
} from '@renderer/components/ui/lib/template-loader'
import { AppConfig } from '@root/shared/ipc/app-config'
import { YtdlpInfo } from '@root/shared/ipc/get-media-info'
import { localizeElementsText } from '@renderer/lib/utils'

const MEDIA_INFO_NAME = 'media-info-screen'
export const DOWNLOAD_STARTED_EVENT_NAME = 'download:started'

export class MediaInfoScreen extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)

  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // State
  private _config: AppConfig | null = null
  private _info: YtdlpInfo | null = null
  private _videoOptions: VideoOption[] = []
  private _audioOptions: AudioOption[] = []

  private _audioPresent = false
  private _isPlaylist = false
  private _processor: MediaInfoProcessor | null = null
  private _durationSec: number | null = null
  private _timeEventsAborter: AbortController | null = null
  private _selectedDownloadPath: string | null = null
  private _subtitlesChecked = false
  private _url: string | null = null

  //refs
  private _tabsEl: HTMLElement | null = null
  private _videoFormatSelect: UISelect | null = null
  private _audioFormatSelect: UISelect | null = null
  private _audioForVideoFormatSelect: UISelect | null = null
  private _timeStartEl: UIInput | null = null
  private _timeEndEl: UIInput | null = null
  private _downloadPathTextEl: HTMLElement | null = null
  private _downloadPathChangeBtn: UIButton | null = null
  private _subtitlesCheckbox: UICheckbox | null = null
  private _startDownloadBtn: UIButton | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    this._render()
    this._cacheRefs()
    this._config = await window.api.config.getConfig()
    this._init()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._setupListeners()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [MediaInfoScreen.sheet]
    this.shadowRoot.append(MediaInfoScreen.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._tabsEl = this.shadowRoot.querySelector('[data-el="tabs"]') as HTMLElement | null
    this._videoFormatSelect = this.shadowRoot.querySelector(
      '[data-el="video-format-select"]'
    ) as UISelect | null
    this._audioFormatSelect = this.shadowRoot.querySelector(
      '[data-el="audio-format-select"]'
    ) as UISelect | null
    this._audioForVideoFormatSelect = this.shadowRoot.querySelector(
      '[data-el="audio-for-video-format-select"]'
    ) as UISelect | null
    this._downloadPathTextEl = this.shadowRoot.querySelector(
      '[data-el="download-path-text"]'
    ) as HTMLElement | null
    this._downloadPathChangeBtn = this.shadowRoot.querySelector(
      '[data-el="download-path-change-btn"]'
    ) as UIButton | null
    this._subtitlesCheckbox = this.shadowRoot.querySelector(
      '[data-el="subtitles-checkbox"]'
    ) as UICheckbox | null
    this._timeStartEl = this.shadowRoot.querySelector(
      '[data-el="time-start-input"]'
    ) as UIInput | null
    this._timeEndEl = this.shadowRoot.querySelector('[data-el="time-end-input"]') as UIInput | null
    this._startDownloadBtn = this.shadowRoot.querySelector(
      '[data-el="start-download-btn"]'
    ) as UIButton | null
  }

  private async _init(): Promise<void> {
    if (!this._downloadPathTextEl || !this._config) return
    this._downloadPathTextEl.textContent = this._config.downloads.downloadDir
    this._selectedDownloadPath = this._config.downloads.downloadDir
  }

  private _setupListeners(): void {
    // download path
    this._downloadPathChangeBtn?.addEventListener('click', this._handleChangePathClick)

    // download path change
    window.api.preferences.downloadPath.changedLocal((path) => {
      this._handleChangedPath(path)
    })

    // subtitles
    this._subtitlesCheckbox?.addEventListener('change', () => {
      this._handleSubtitlesCheckboxChange()
    })

    // start download: use active tab as discriminator between Video and Audio modes
    this._startDownloadBtn?.addEventListener('click', async () => {
      await this._handleStartDownloadClick()
    })

    // time inputs
    this._bindTimeInputEvents()
  }

  private _handleChangePathClick(): void {
    window.api.preferences.downloadPath.changeLocal()
  }

  private _handleChangedPath(path: string): void {
    if (!this._downloadPathTextEl) return
    this._downloadPathTextEl.textContent = path
    this._selectedDownloadPath = path
  }

  private _handleSubtitlesCheckboxChange(): void {
    this._subtitlesChecked = this._subtitlesCheckbox?.checked ?? false
  }

  // Decide which download type to run based on the currently active tab value
  private async _handleStartDownloadClick(): Promise<void> {
    const tabValue = (this._tabsEl?.getAttribute('value') || 'video').toString()
    const kind: 'Video' | 'Audio' = tabValue === 'audio' ? 'Audio' : 'Video'
    await this._startDownload(kind).then(() => {
      this.dispatchEvent(
        new CustomEvent(DOWNLOAD_STARTED_EVENT_NAME, { bubbles: true, composed: true })
      )
    })
  }

  private _bindTimeInputEvents(): void {
    this._timeEventsAborter?.abort()
    this._timeEventsAborter = new AbortController()
    const signal = this._timeEventsAborter.signal
    const handlers: Array<[UIInput | null, string[]]> = [
      [this._timeStartEl, ['change', 'ui-change', 'blur']],
      [this._timeEndEl, ['change', 'ui-change', 'blur']]
    ]
    for (const [el, evts] of handlers) {
      if (!el) continue
      for (const evt of evts) el.addEventListener(evt, () => this._verifyAndClipRange(), { signal })
    }
  }

  // Build and enqueue a download job, sharing common options and using the kind (Video/Audio)
  // as the only discriminator for how formats are interpreted.
  private async _startDownload(kind: 'Video' | 'Audio'): Promise<void> {
    const duration = this._durationSec ?? 0
    const start = this._timeStartEl?.value ?? ''
    const end = this._timeEndEl?.value ?? ''
    const subtitles = this._subtitlesChecked

    // verify and clip before building
    this._verifyAndClipRange()

    // Snapshot current UI selects
    if (!this._url || !this._info) return
    const isVideo = kind === 'Video'
    const processor = new DownloadProcessor({
      url: this._url,
      type: kind,
      info: this._info as YtdlpInfo,
      duration,
      startInput: start,
      endInput: end,
      subtitles,
      downloadDir: this._selectedDownloadPath,
      videoFormat: isVideo ? (this._videoFormatSelect?.getAttribute('value') ?? '') : '',
      audioForVideoFormat: isVideo
        ? (this._audioForVideoFormatSelect?.getAttribute('value') ?? '')
        : '',
      audioFormat: this._audioFormatSelect?.getAttribute('value') ?? ''
    })
    const downloadJob = processor.build()
    if (!downloadJob) return
    await window.api.downloadJobs.add(downloadJob)
    console.log('download job:', downloadJob)
    console.log('fetched info:', this._info)
  }

  private async _initMediaProcessor(): Promise<void> {
    const prefs = await this._getPreferences()
    if (!this._processor) this._processor = new MediaInfoProcessor(prefs)
  }

  private async _ensureProcessorThenHandleFormats(value: YtdlpInfo | null): Promise<void> {
    if (!this._processor) await this._initMediaProcessor()
    await this._handleFormats(value)
  }
  // length
  private async _ensureProcessorThenCalcVideoLength(value: YtdlpInfo | null): Promise<void> {
    if (!this._processor) await this._initMediaProcessor()
    this._calcVideoLength(value)
  }

  private _calcVideoLength(value: YtdlpInfo | null): void {
    if (!this._processor || !value) return
    const res = this._processor.processVideoLength(value)
    if (!res) return
    this._durationSec = res.durationSec
    if (this._timeStartEl) this._timeStartEl.setAttribute('placeholder', '0:00:00')
    if (this._timeEndEl) this._timeEndEl.setAttribute('placeholder', `${res.formatted}`)
  }

  private _parseTimeToSeconds(v: string | null | undefined): number | null {
    if (!v) return null
    const s = v.trim()
    if (s === '') return null
    // Accept SS, MM:SS, HH:MM:SS
    const parts = s
      .split(':')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.some((p) => !/^\d+$/.test(p))) return null
    let sec = 0
    if (parts.length === 1) {
      sec = Number(parts[0])
    } else if (parts.length === 2) {
      sec = Number(parts[0]) * 60 + Number(parts[1])
    } else if (parts.length === 3) {
      sec = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
    } else return null
    return Number.isFinite(sec) && sec >= 0 ? sec : null
  }

  private _verifyAndClipRange(): void {
    const max = this._durationSec ?? null
    if (max == null) return
    const startStr =
      (this._timeStartEl?.getAttribute('value') || '').toString() || this._timeStartEl?.value || ''
    const endStr =
      (this._timeEndEl?.getAttribute('value') || '').toString() || this._timeEndEl?.value || ''
    let start = this._parseTimeToSeconds(startStr)
    let end = this._parseTimeToSeconds(endStr)
    if (start == null) start = 0
    if (end == null) end = max
    // Clamp to [0, max]
    start = Math.max(0, Math.min(start, max))
    end = Math.max(0, Math.min(end, max))
    // Ensure start <= end by clipping
    if (start > end) {
      // Clip start down to end
      start = end
    }
    // Reflect corrected values back to inputs
    if (!this._processor) return
    const startFmt = this._processor.formatSecondsToHMS(start)
    const endFmt = this._processor.formatSecondsToHMS(end)
    if (this._timeStartEl) {
      this._timeStartEl.setAttribute('value', startFmt)
      this._timeStartEl.value = startFmt
    }
    if (this._timeEndEl) {
      this._timeEndEl.setAttribute('value', endFmt)
      this._timeEndEl.value = endFmt
    }
  }

  // formats
  private async _handleFormats(value: YtdlpInfo | null): Promise<void> {
    if (!this._processor || !value) return
    const res = this._processor.processVideoFormats(value)
    this._videoOptions = res.video
    this._audioOptions = res.audio
    this._audioPresent = res.audioPresent
    this._isPlaylist = res.isPlaylist
    this.toggleAttribute('data-is-playlist', this._isPlaylist)
    this._renderFormatSelects()
  }

  private async _getPreferences(): Promise<Preferences> {
    return {
      videoQuality: Number(this._config?.downloads.videoQuality ?? '1080'),
      videoCodec: this._config?.downloads.videoCodec ?? 'avc1',
      showMoreFormats: false
    }
  }

  private _renderFormatSelects(): void {
    if (!this.shadowRoot) return
    if (this._videoFormatSelect) {
      this._videoFormatSelect.innerHTML = ''
      let defaultValue: string | null = null
      for (const v of this._videoOptions) {
        const optEl = document.createElement('ui-option')
        optEl.setAttribute('value', `${v.id}|${v.ext}|${v.height ?? ''}`)
        optEl.textContent = v.display
        if (v.selected && !defaultValue) defaultValue = optEl.getAttribute('value')
        this._videoFormatSelect.appendChild(optEl)
      }
      if (defaultValue) this._videoFormatSelect.setAttribute('value', defaultValue)
    }
    if (this._audioForVideoFormatSelect) {
      this._audioForVideoFormatSelect.innerHTML = ''
      for (const a of this._audioOptions) {
        const optEl = document.createElement('ui-option')
        optEl.setAttribute('value', `${a.id}|${a.ext}`)
        optEl.textContent = a.display
        this._audioForVideoFormatSelect.appendChild(optEl)
      }
    }
    if (this._audioFormatSelect) {
      this._audioFormatSelect.innerHTML = ''
      for (const a of this._audioOptions) {
        const optEl = document.createElement('ui-option')
        optEl.setAttribute('value', `${a.id}|${a.ext}`)
        optEl.textContent = a.display
        this._audioFormatSelect.appendChild(optEl)
      }
    }
  }

  //------------------------------Public API-----------------------------
  get url(): string | null {
    return this._url
  }

  set url(value: string | null) {
    this._url = value
  }

  get info(): YtdlpInfo | null {
    return this._info
  }

  set info(value: YtdlpInfo | null) {
    this._info = value
    void this._ensureProcessorThenCalcVideoLength(value)
    void this._ensureProcessorThenHandleFormats(value)
  }
}
if (!customElements.get(MEDIA_INFO_NAME)) {
  customElements.define(MEDIA_INFO_NAME, MediaInfoScreen)
}

declare global {
  interface HTMLElementTagNameMap {
    [MEDIA_INFO_NAME]: MediaInfoScreen
  }

  interface HTMLElementEventMap {
    [DOWNLOAD_STARTED_EVENT_NAME]: CustomEvent<void>
  }
}
