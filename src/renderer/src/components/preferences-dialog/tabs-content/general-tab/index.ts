import template from './template.html?raw'
import sharedStyleCss from '../shared.css?inline'
import styleCss from './style.css?inline'
import { storage } from '@renderer/lib/storage'
import { UIButton, UIInput, UISelect, UICheckbox } from '@renderer/components/ui'
import { getLanguage, Locale, setLanguage } from '@renderer/lib/i18n'
import { DATA } from '@renderer/lib/data'

export class GeneralTab extends HTMLElement {
  private themeSelect: UISelect | null = null
  private input: HTMLElement | null = null
  private languageSelect: UISelect | null = null
  private maxDownloadsControls: HTMLElement | null = null
  private maxDownloadsInput: HTMLElement | null = null
  private videoQualitySelect: UISelect | null = null
  private videoCodecSelect: UISelect | null = null
  private audioQualitySelect: UISelect | null = null
  private fileNameFormatPlaylistsInput: UIInput | null = null
  private folderNameFormatPlaylistsInput: UIInput | null = null
  private t = window.api?.i18n?.t || (() => '')
  private _systemMql: MediaQueryList | null = null
  private _systemMqlHandler: ((e: MediaQueryListEvent) => void) | null = null
  private closeAppToSystemTraySwitch: UICheckbox | null = null
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('#general-tab-template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = sharedStyleCss + styleCss
    this.shadowRoot?.append(style, content)
    this.themeSelect = this.shadowRoot?.querySelector<UISelect>('#theme-select') || null
    this.input = this.shadowRoot?.querySelector<HTMLElement>('#download-path-input') || null
    this.languageSelect = this.shadowRoot?.querySelector<UISelect>('#language-select') || null
    this.maxDownloadsControls =
      this.shadowRoot?.querySelector<HTMLElement>('#max-downloads-controls') || null
    this.maxDownloadsInput = this.maxDownloadsControls?.querySelector<HTMLElement>('span') || null
    this.videoQualitySelect =
      this.shadowRoot?.querySelector<UISelect>('#video-quality-select') || null
    this.videoCodecSelect = this.shadowRoot?.querySelector<UISelect>('#video-codec-select') || null
    this.audioQualitySelect =
      this.shadowRoot?.querySelector<UISelect>('#audio-quality-select') || null
    this.fileNameFormatPlaylistsInput =
      this.shadowRoot?.querySelector<UIInput>('#file-name-format-playlists-input') || null
    this.folderNameFormatPlaylistsInput =
      this.shadowRoot?.querySelector<UIInput>('#folder-name-format-playlists-input') || null
    this.closeAppToSystemTraySwitch =
      this.shadowRoot?.querySelector<UICheckbox>('#close-app-to-system-tray-switch') || null
    this.changeTheme()
    this.syncTheme()
    this.changeDownloadPath()
    this.syncDownloadPath()
    this.syncLanguage()
    this.changeLanguage()
    this.applyI18n()
    this.syncMaxDownloads()
    this.changeMaxDownloads()
    this.wireRestartButton()
    this.changeVideoQuality()
    this.syncVideoQuality()
    this.syncVideoCodec()
    this.changeVideoCodec()
    this.syncAudioQuality()
    this.changeAudioQuality()
    this.syncFileNameFormatPlaylists()
    this.changeFileNameFormatPlaylists()
    this.resetFileNameFormatPlaylists()
    this.syncFolderNameFormatPlaylists()
    this.changeFolderNameFormatPlaylists()
    this.resetFolderNameFormatPlaylists()
    this.syncCloseAppToSystemTray()
    this.changeCloseAppToSystemTray()
  }

  private syncFileNameFormatPlaylists(): void {
    if (!this.fileNameFormatPlaylistsInput) return
    const saved = storage.get('fileNameFormatPlaylists')
    this.fileNameFormatPlaylistsInput.setAttribute(
      'value',
      saved ?? DATA.config.fileNameFormatPlaylists
    )
  }

  private changeFileNameFormatPlaylists(): void {
    if (!this.fileNameFormatPlaylistsInput) return
    this.fileNameFormatPlaylistsInput.addEventListener('change', (e) => {
      const input = e.target as UIInput
      const value = input.value
      if (!value) return
      storage.set('fileNameFormatPlaylists', value)
    })
  }

  private resetFileNameFormatPlaylists(): void {
    const resetButton = this.shadowRoot?.querySelector<UIButton>('[data-action="reset-file-name"]')
    if (!this.fileNameFormatPlaylistsInput || !resetButton) return
    resetButton.addEventListener('click', () => {
      this.fileNameFormatPlaylistsInput?.setAttribute('value', DATA.config.fileNameFormatPlaylists)
      storage.set('fileNameFormatPlaylists', DATA.config.fileNameFormatPlaylists)
    })
  }

  private syncFolderNameFormatPlaylists(): void {
    if (!this.folderNameFormatPlaylistsInput) return
    const saved = storage.get('folderNameFormatPlaylists')
    this.folderNameFormatPlaylistsInput.setAttribute(
      'value',
      saved ?? DATA.config.folderNameFormatPlaylists
    )
  }

  private changeFolderNameFormatPlaylists(): void {
    if (!this.folderNameFormatPlaylistsInput) return
    this.folderNameFormatPlaylistsInput.addEventListener('input', (e) => {
      const input = e.target as UIInput
      const value = input.value
      if (!value) return
      storage.set('folderNameFormatPlaylists', value)
    })
  }

  private resetFolderNameFormatPlaylists(): void {
    const resetButton = this.shadowRoot?.querySelector<UIButton>(
      '[data-action="reset-folder-name"]'
    )
    if (!this.folderNameFormatPlaylistsInput || !resetButton) return
    resetButton.addEventListener('click', () => {
      this.folderNameFormatPlaylistsInput?.setAttribute(
        'value',
        DATA.config.folderNameFormatPlaylists
      )
      storage.set('folderNameFormatPlaylists', DATA.config.folderNameFormatPlaylists)
    })
  }

  private syncVideoCodec(): void {
    if (!this.videoCodecSelect) return
    const options = DATA.videoCodecs.map((codec) => {
      return `<ui-option value="${codec.value}">${codec.label}</ui-option>`
    })
    this.videoCodecSelect.innerHTML = options.join('')
    const saved = storage.get('videoCodec')
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
      storage.set('videoCodec', value)
    })
  }

  private syncAudioQuality(): void {
    if (!this.audioQualitySelect) return
    const options = DATA.audioQualities.map((quality) => {
      return `<ui-option value="${quality.value}">${quality.label}</ui-option>`
    })
    this.audioQualitySelect.innerHTML = options.join('')
    const saved = storage.get('audioQuality')
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
      storage.set('audioQuality', value)
    })
  }

  private syncVideoQuality(): void {
    if (!this.videoQualitySelect) return
    const options = DATA.videoQualities.map((quality) => {
      return `<ui-option value="${quality.value}">${quality.label}</ui-option>`
    })
    this.videoQualitySelect.innerHTML = options.join('')
    const saved = storage.get('videoQuality')
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
      storage.set('videoQuality', value)
    })
  }

  private syncMaxDownloads(): void {
    if (!this.maxDownloadsInput) return
    const saved = storage.get('maxDownloads')
    if (saved) {
      this.maxDownloadsInput.textContent = saved
      this.maxDownloadsInput.setAttribute('title', saved)
    }
  }

  private changeMaxDownloads(): void {
    const buttons = this.maxDownloadsControls?.querySelectorAll<UIButton>('ui-button') || []
    if (!buttons.length) return
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        if (!this.maxDownloadsInput) return
        const value = parseInt(this.maxDownloadsInput.textContent || '5', 10)
        const isDecrement = button.getAttribute('data-action') === 'decrement'
        let next = isDecrement ? value - 1 : value + 1
        if (next <= 0) next = 1
        this.maxDownloadsInput.textContent = next.toString()
        this.maxDownloadsInput.setAttribute('title', next.toString())
        storage.set('maxDownloads', next.toString())
      })
    })
  }

  private syncDownloadPath(): void {
    if (!this.input) return
    const saved = storage.get('downloadPath')
    if (saved) {
      this.input.textContent = saved
      this.input.setAttribute('title', saved)
    }
    window.api?.generalPreferences?.changedDownloadPath((location: string | string[]) => {
      if (!this.input) return
      const path = Array.isArray(location) ? (location[0] ?? '') : location
      if (!path) return
      this.input.textContent = path
      this.input.setAttribute('title', path)
      storage.set('downloadPath', path)
    })
  }

  private changeDownloadPath(): void {
    const button = this.shadowRoot?.querySelector<UIButton>('#download-path-button') || null
    if (!button) return
    button.addEventListener('click', () => {
      window.api?.generalPreferences?.changeDownloadPath()
    })
  }

  private syncTheme(): void {
    let theme = storage.get('theme')
    if (!theme) {
      theme = 'system'
      storage.set('theme', theme)
    }
    if (this.themeSelect) {
      const options = DATA.themes.map((theme) => {
        return `<ui-option value="${theme.value}">${this.t(theme.label)}</ui-option>`
      })
      this.themeSelect.innerHTML = options.join('')
      this.themeSelect.setAttribute('value', theme)
    }
    // Apply theme on load
    if (theme === 'system') {
      this.applySystemTheme()
    } else if (theme === 'light') {
      this.teardownSystemTheme()
      document.documentElement.classList.remove('dark')
    } else if (theme === 'dark') {
      this.teardownSystemTheme()
      document.documentElement.classList.add('dark')
    }
  }

  private changeTheme(): void {
    if (!this.themeSelect) return
    this.themeSelect.addEventListener('change', (e) => {
      const select = e.target as UISelect
      const value = select.value
      if (!value) return
      storage.set('theme', value)
      const x = window.innerWidth
      const y = 0
      const maxRadius = Math.hypot(window.innerWidth, window.innerHeight)
      const transition = document.startViewTransition(() => {
        if (value === 'system') {
          this.applySystemTheme()
        } else if (value === 'light') {
          this.teardownSystemTheme()
          document.documentElement.classList.remove('dark')
        } else if (value === 'dark') {
          this.teardownSystemTheme()
          document.documentElement.classList.add('dark')
        }
      })
      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`]
          },
          {
            duration: 1100,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        )
      })
    })
  }

  private applySystemTheme(): void {
    if (!this._systemMql) {
      this._systemMql = window.matchMedia('(prefers-color-scheme: dark)')
    }
    const apply = (isDark: boolean): void => {
      if (isDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
    apply(this._systemMql.matches)
    if (!this._systemMqlHandler) {
      this._systemMqlHandler = (e: MediaQueryListEvent) => apply(e.matches)
      this._systemMql.addEventListener('change', this._systemMqlHandler)
    }
  }

  private teardownSystemTheme(): void {
    if (this._systemMql && this._systemMqlHandler) {
      this._systemMql.removeEventListener('change', this._systemMqlHandler)
    }
    this._systemMqlHandler = null
  }

  private syncLanguage(): void {
    if (!this.languageSelect) return
    const options = DATA.languages.map((lang) => {
      return `<ui-option value="${lang.value}">${lang.label}</ui-option>`
    })
    this.languageSelect.innerHTML = options.join('')
    const lang = getLanguage()
    this.languageSelect.setAttribute('value', lang)
  }

  private changeLanguage(): void {
    if (!this.languageSelect) return
    this.languageSelect.addEventListener('change', (e) => {
      const sel = e.target as UISelect
      const value = sel.value
      if (!value) return
      setLanguage(value as Locale)
    })
  }

  private applyI18n(): void {
    const root = this.shadowRoot
    if (!root) return
    // translate static labels
    root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n') || ''
      if (!key) return
      el.textContent = this.t(key)
    })
    // update placeholders from pref.* namespace
    const darkMode = this.shadowRoot?.querySelector<UISelect>('#dark-mode-select')
    if (darkMode) darkMode.setAttribute('placeholder', this.t('pref.general.theme.placeholder'))
    const langSel = this.languageSelect
    if (langSel) langSel.setAttribute('placeholder', this.t('pref.general.language.placeholder'))

    const qualityH2 = root.querySelector<HTMLElement>(
      'h2[data-i18n="pref.general.videoQuality.title"]'
    )
    const quality = qualityH2?.parentElement?.querySelector<UISelect>('ui-select') || null
    if (quality)
      quality.setAttribute('placeholder', this.t('pref.general.videoQuality.placeholder'))

    const codecH2 = root.querySelector<HTMLElement>('h2[data-i18n="pref.general.videoCodec.title"]')
    const codec = codecH2?.parentElement?.querySelector<UISelect>('ui-select') || null
    if (codec) codec.setAttribute('placeholder', this.t('pref.general.videoCodec.placeholder'))

    const audioH2 = root.querySelector<HTMLElement>(
      'h2[data-i18n="pref.general.audioQuality.title"]'
    )
    const audio = audioH2?.parentElement?.querySelector<UISelect>('ui-select') || null
    if (audio) audio.setAttribute('placeholder', this.t('pref.general.audioQuality.placeholder'))
  }

  private wireRestartButton(): void {
    const root = this.shadowRoot
    if (!root) return
    const btn = root.querySelector<UIButton>('#restart-app-button')
    if (!btn) return
    btn.addEventListener('click', () => {
      window.api?.window?.reload()
    })
  }

  private syncCloseAppToSystemTray(): void {
    if (!this.closeAppToSystemTraySwitch) return
    const saved = storage.get('closeAppToSystemTray')
    const isChecked = (saved ?? DATA.config.closeAppToSystemTray.toString()) === 'true'
    this.closeAppToSystemTraySwitch.toggleAttribute('checked', isChecked)
  }

  private changeCloseAppToSystemTray(): void {
    if (!this.closeAppToSystemTraySwitch) return
    this.closeAppToSystemTraySwitch.addEventListener('change', (e) => {
      const checkbox = e.target as UICheckbox
      const value = checkbox.checked
      storage.set('closeAppToSystemTray', value.toString())
      // TODO: send to main process to update system tray
    })
  }
}

customElements.define('general-tab-content', GeneralTab)
