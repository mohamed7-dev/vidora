import template from './template.html?raw'
import styleCss from './style.css?inline'
import { YtdlpInfo } from '@root/shared/downloads'
import { MediaInfoProcessor, type Preferences, type VideoOption, type AudioOption } from './formats'
import type { UIInput } from '../../../ui/input/index'
import { DownloadProcessor } from './download'
import { AppConfig } from '@root/shared/types'
import { UIButton, UICheckbox, UISelect } from '@renderer/components/ui'

export class MediaInfoScreen extends HTMLElement {
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

  // State
  private t = window.api.i18n?.t ?? (() => '')
  private _config: AppConfig | null = null
  private _info: YtdlpInfo | null = null
  private _videoOptions: VideoOption[] = []
  private _audioOptions: AudioOption[] = []

  // private _audioPresent = false
  private _isPlaylist = false
  private _processor: MediaInfoProcessor | null = null
  private _durationSec: number | null = null
  private _timeEventsAborter: AbortController | null = null
  private _selectedDownloadPath: string | null = null
  private _subtitlesChecked = false
  private _url: string | null = null

  //refs
  private _videoFormatSelect: UISelect | null = null
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
    this._config = await window.api.config.getConfig()
    this._cacheRefs()
    this._initRefs()
    this._applyI18n()
    this._setupListeners()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [MediaInfoScreen.sheet]
    // append cached template content
    this.shadowRoot.append(MediaInfoScreen.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._videoFormatSelect = this.shadowRoot.querySelector(
      '#video-format-select'
    ) as UISelect | null
    this._audioForVideoFormatSelect = this.shadowRoot.querySelector(
      '#audio-for-video-format-select'
    ) as UISelect | null
    this._downloadPathTextEl = this.shadowRoot.querySelector(
      '#download-path-text'
    ) as HTMLElement | null
    this._downloadPathChangeBtn = this.shadowRoot.querySelector(
      '#download-path-change-btn'
    ) as UIButton | null
    this._subtitlesCheckbox = this.shadowRoot.querySelector(
      '#subtitles-checkbox'
    ) as UICheckbox | null
    this._timeStartEl = this.shadowRoot.querySelector('#time-start') as UIInput | null
    this._timeEndEl = this.shadowRoot.querySelector('#time-end') as UIInput | null
    this._startDownloadBtn = this.shadowRoot.querySelector('#start-download-btn') as UIButton | null
  }

  private _applyI18n(): void {
    if (!this.shadowRoot) return
    // text content translations
    this.shadowRoot.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n')
      if (key) {
        el.textContent = this.t(key)
      }
      const placeholder = el.getAttribute('placeholder')
      if (placeholder) {
        el.setAttribute('placeholder', this.t(placeholder))
      }
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

  private async _initRefs(): Promise<void> {
    if (!this._downloadPathTextEl || !this._config) return
    this._downloadPathTextEl.textContent = this._config.downloads.downloadDir
    this._selectedDownloadPath = this._config.downloads.downloadDir
  }

  private _setupListeners(): void {
    // download path
    this._downloadPathChangeBtn?.addEventListener('click', () => {
      window.api.mediaPreferences.changeMediaDownloadPath()
    })

    // download path change
    window.api.mediaPreferences.changedMediaDownloadPath((path) => {
      if (!this._downloadPathTextEl) return
      this._downloadPathTextEl.textContent = path
      this._selectedDownloadPath = path
    })

    // subtitles
    this._subtitlesCheckbox?.addEventListener('change', () => {
      this._subtitlesChecked = this._subtitlesCheckbox?.checked ?? false
    })

    // start download
    this._startDownloadBtn?.addEventListener('click', async () => {
      await this._startDownload().then(() => {
        this.dispatchEvent(new CustomEvent('download:started', { bubbles: true, composed: true }))
      })
    })

    // time inputs
    this._bindTimeInputEvents()
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

  private async _startDownload(): Promise<void> {
    const duration = this._durationSec ?? 0
    const start = this._timeStartEl?.value ?? ''
    const end = this._timeEndEl?.value ?? ''
    const subtitles = this._subtitlesChecked

    // verify and clip before building
    this._verifyAndClipRange()

    // Snapshot current UI selects
    if (!this._url) return
    const processor = new DownloadProcessor({
      url: this._url,
      type: 'Video',
      info: this._info as YtdlpInfo,
      duration,
      startInput: start,
      endInput: end,
      subtitles,
      downloadDir: this._selectedDownloadPath,
      videoFormat: this._videoFormatSelect?.getAttribute('value') ?? '',
      audioForVideoFormat: this._audioForVideoFormatSelect?.getAttribute('value') ?? ''
    })
    const downloadJob = processor.build()
    if (!downloadJob) return
    await window.api.jobs.add(downloadJob)
    console.log('download job:', downloadJob)
    console.log('fetched info:', this._info)
  }

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
    // this._audioPresent = res.audioPresent
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
  }
}
if (!customElements.get('media-info-screen')) {
  customElements.define('media-info-screen', MediaInfoScreen)
}

declare global {
  interface HTMLElementTagNameMap {
    'media-info-screen': MediaInfoScreen
  }

  interface HTMLElementEventMap {
    'download:started': CustomEvent<void>
  }
}
