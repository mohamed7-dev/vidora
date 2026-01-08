import '../../../area-article/index'
import '../../../area-section/index'
import html from './template.html?raw'
import style from './style.css?inline'
import { DATA } from '@root/shared/data'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { type UiSelectContent } from '@ui/select/ui-select-content'
import { type UiSelect } from '@ui/select/ui-select'
import { type UiButton } from '@ui/button/ui-button'
import { UICheckValueDetail, type UICheckbox } from '@ui/checkbox/ui-checkbox'
import { AppConfig } from '@root/shared/ipc/app-config'
import { UI_SELECT_EVENTS, type ValueChangeEventDetail } from '@ui/select/constants'
import { localizeElementsText } from '@renderer/lib/ui/localize'

const GENERAL_TAB_TAG_NAME = 'general-tab-content'

export class GeneralTabContent extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)
  // states
  private initialConfig: AppConfig | null = null
  private _eventsAborter: AbortController | null = null
  private _changeThemeUnsub: (() => void) | null = null

  // private initialConfig: AppConfig | null = null
  private t = window.api?.i18n?.t || (() => '')
  private needsReload = false
  private needsRelaunch = false

  // refs
  private themeSelectContent: UiSelectContent | null = null
  private themeSelect: UiSelect | null = null
  private languageSelect: UiSelect | null = null
  private languageSelectContent: UiSelectContent | null = null
  private closeAppToSystemTraySwitch: UICheckbox | null = null
  private useNativeToolbarSwitch: UICheckbox | null = null
  private autoUpdateSwitch: UICheckbox | null = null
  private restartBtn: UiButton | null = null
  private checkForUpdatesBtn: UiButton | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    this._render()
    this._cacheRefs()
    if (!this._eventsAborter) {
      this._eventsAborter = new AbortController()
    }
    const config = (await window.api.config.getConfig()) || null
    this.initialConfig = config ? JSON.parse(JSON.stringify(config)) : null
    this._syncTheme()
    this._changeTheme()
    this._syncLanguage()
    this._changeLanguage()
    this._wireRestartButton()
    this._wireCheckForUpdatesButton()
    this._syncCloseAppToSystemTray()
    this._changeCloseAppToSystemTray()
    this._syncUseNativeToolbar()
    this._changeUseNativeToolbar()
    this._syncAutoUpdate()
    this._changeAutoUpdate()
    localizeElementsText(this.shadowRoot as ShadowRoot)
  }

  disconnectedCallback(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = null
    this._changeThemeUnsub?.()
    this._changeThemeUnsub = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [GeneralTabContent.sheet]
    this.shadowRoot.append(GeneralTabContent.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    this.themeSelectContent =
      this.shadowRoot?.querySelector<UiSelectContent>('[data-el="theme-select-content"]') || null
    this.themeSelect = this.shadowRoot?.querySelector<UiSelect>('[data-el="theme-select"]') || null
    this.languageSelect =
      this.shadowRoot?.querySelector<UiSelect>('[data-el="language-select"]') || null
    this.languageSelectContent =
      this.shadowRoot?.querySelector<UiSelectContent>('[data-el="language-select-content"]') || null
    this.restartBtn =
      this.shadowRoot?.querySelector<UiButton>('[data-el="restart-app-button"]') || null
    this.checkForUpdatesBtn =
      this.shadowRoot?.querySelector<UiButton>('[data-el="check-for-updates-button"]') || null
    this.closeAppToSystemTraySwitch =
      this.shadowRoot?.querySelector<UICheckbox>('[data-el="close-app-to-system-tray-checkbox"]') ||
      null
    this.useNativeToolbarSwitch =
      this.shadowRoot?.querySelector<UICheckbox>('[data-el="use-native-toolbar-checkbox"]') || null
    this.autoUpdateSwitch =
      this.shadowRoot?.querySelector<UICheckbox>('[data-el="auto-update-checkbox"]') || null
  }

  private _syncTheme(): void {
    if (!this.themeSelectContent || !this.themeSelect) return
    const theme = this.initialConfig?.general.theme
    if (!theme) return
    if (this.themeSelectContent) {
      const options = DATA.themes.map((theme) => {
        return `<ui-select-option value="${theme.value}">${this.t(theme.label)}</ui-select-option>`
      })
      this.themeSelectContent.innerHTML = options.join('')
      this.themeSelect.value = theme
    }
  }

  private _changeTheme(): void {
    if (!this.themeSelect) return
    if (!this._eventsAborter) return
    this.themeSelect.addEventListener(
      UI_SELECT_EVENTS.VALUE_CHANGE,
      (e) => {
        const detail = (e as CustomEvent<ValueChangeEventDetail>).detail
        if (detail.selectId !== this.themeSelect?.instanceId) return
        const value = detail.value
        if (!value) return
        // Wait for actual config update before animating for accurate visual change
        this._changeThemeUnsub = window.api.config.onUpdated((cfg) => {
          if (cfg.general.theme !== value) return
          if (this._changeThemeUnsub) {
            this._changeThemeUnsub()
            this._changeThemeUnsub = null
          }
          const x = window.innerWidth / 2
          const y = window.innerHeight / 2
          const maxRadius = Math.hypot(window.innerWidth, window.innerHeight)
          const transition = document.startViewTransition(() => {
            // preload already syncs theme
          })
          transition.ready
            .then(() => {
              const animation = document.documentElement.animate(
                {
                  clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${maxRadius}px at ${x}px ${y}px)`
                  ],
                  opacity: [0.6, 1]
                },
                {
                  duration: 700,
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  pseudoElement: '::view-transition-new(root)'
                }
              )
              return animation.finished
            })
            .catch((err) => {
              if ((err as DOMException).name !== 'AbortError') {
                console.error(err)
              }
            })
        })
        window.api.config.updateConfig({ general: { theme: value } }).catch(() => {
          if (this._changeThemeUnsub) this._changeThemeUnsub()
        })
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncLanguage(): void {
    if (!this.languageSelect || !this.languageSelectContent) return
    const options = DATA.languages.map((lang) => {
      return `<ui-select-option value="${lang.value}">${lang.label}</ui-select-option>`
    })
    this.languageSelectContent.innerHTML = options.join('')
    const lang = this.initialConfig?.general.language
    if (lang) {
      this.languageSelect.value = lang
    }
  }

  private _changeLanguage(): void {
    if (!this.languageSelect) return
    if (!this._eventsAborter) return
    this.languageSelect.addEventListener(
      UI_SELECT_EVENTS.VALUE_CHANGE,
      (e) => {
        const detail = (e as CustomEvent<ValueChangeEventDetail>).detail
        if (detail.selectId !== this.languageSelect?.instanceId) return
        const value = detail.value
        if (!value) return
        // Persist and update internal state
        const originalLanguage = this.initialConfig?.general.language
        window.api.config
          .updateConfig({ general: { language: value } })
          .then(() => {
            if (this.initialConfig) this.initialConfig.general.language = value
          })
          .catch(() => {})
        // Mark reload required only if changed from initial
        this.needsReload = value !== originalLanguage
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _wireRestartButton(): void {
    if (!this.restartBtn) return
    if (!this._eventsAborter) return
    this.restartBtn.addEventListener(
      'click',
      () => {
        if (this.needsRelaunch) {
          window.api.app.relaunch()
        } else if (this.needsReload) {
          window.api.window.reload()
        }
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _wireCheckForUpdatesButton(): void {
    if (!this.checkForUpdatesBtn) return
    if (!this._eventsAborter) return
    this.checkForUpdatesBtn.addEventListener(
      'click',
      () => {
        // TODO: check for updates
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncCloseAppToSystemTray(): void {
    if (!this.closeAppToSystemTraySwitch) return
    const useTray = this.initialConfig?.general.closeToTray
    this.closeAppToSystemTraySwitch.checked = !!useTray
  }

  private _changeCloseAppToSystemTray(): void {
    if (!this.closeAppToSystemTraySwitch) return
    if (!this._eventsAborter) return
    this.closeAppToSystemTraySwitch.addEventListener(
      'change',
      (e) => {
        const detail = (e as CustomEvent<UICheckValueDetail>).detail
        const value = detail.checked
        window.api.config.updateConfig({ general: { closeToTray: value } }).catch(() => {})
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncUseNativeToolbar(): void {
    if (!this.useNativeToolbarSwitch) return
    const useNativeToolbar = this.initialConfig?.general.useNativeToolbar
    this.useNativeToolbarSwitch.checked = !!useNativeToolbar
  }

  private _changeUseNativeToolbar(): void {
    if (!this.useNativeToolbarSwitch) return
    if (!this._eventsAborter) return
    this.useNativeToolbarSwitch.addEventListener(
      'change',
      (e) => {
        const detail = (e as CustomEvent<UICheckValueDetail>).detail
        const value = detail.checked
        const originalUseNativeToolbar = this.initialConfig?.general.useNativeToolbar
        window.api.config
          .updateConfig({ general: { useNativeToolbar: value } })
          .then(() => {
            if (this.initialConfig) this.initialConfig.general.useNativeToolbar = value
          })
          .catch(() => {})
        // Mark relaunch required only if changed from initial
        this.needsRelaunch = value !== originalUseNativeToolbar
      },
      { signal: this._eventsAborter.signal }
    )
  }

  private _syncAutoUpdate(): void {
    if (!this.autoUpdateSwitch) return
    const autoUpdate = this.initialConfig?.general.autoUpdate
    this.autoUpdateSwitch.checked = !!autoUpdate
  }

  private _changeAutoUpdate(): void {
    if (!this.autoUpdateSwitch) return
    if (!this._eventsAborter) return
    this.autoUpdateSwitch.addEventListener(
      'change',
      (e) => {
        const detail = (e as CustomEvent<UICheckValueDetail>).detail
        const value = detail.checked
        const originalAutoUpdate = this.initialConfig?.general.autoUpdate
        window.api?.config
          ?.updateConfig({ general: { autoUpdate: value } })
          .then(() => {
            if (this.initialConfig) this.initialConfig.general.autoUpdate = value
          })
          .catch(() => {})
        // Mark relaunch required only if changed from initial
        this.needsRelaunch = value !== originalAutoUpdate
      },
      { signal: this._eventsAborter.signal }
    )
  }
}

if (!customElements.get(GENERAL_TAB_TAG_NAME)) {
  customElements.define(GENERAL_TAB_TAG_NAME, GeneralTabContent)
}
declare global {
  interface HTMLElementTagNameMap {
    [GENERAL_TAB_TAG_NAME]: GeneralTabContent
  }
}
