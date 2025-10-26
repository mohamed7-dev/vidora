import template from './template.html?raw'
import sharedStyleCss from '../shared.css?inline'
import styleCss from './style.css?inline'
import { UIButton, UISelect, UICheckbox } from '@renderer/components/ui'
import { DATA } from '@root/shared/data'
import { AppConfig } from '@root/shared/types'

export class GeneralTab extends HTMLElement {
  private config: AppConfig | null = null
  private themeSelect: UISelect | null = null
  private languageSelect: UISelect | null = null
  private t = window.api?.i18n?.t || (() => '')
  private _systemMql: MediaQueryList | null = null
  private _systemMqlHandler: ((e: MediaQueryListEvent) => void) | null = null
  private closeAppToSystemTraySwitch: UICheckbox | null = null
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    this.render()
    this.config = (await window.api?.config.getConfig()) || null
    this.syncTheme()
    this.changeTheme()
    this.syncLanguage()
    this.changeLanguage()
    this.applyI18n()
    this.wireRestartButton()
    this.syncCloseAppToSystemTray()
    this.changeCloseAppToSystemTray()
  }

  private render(): void {
    const parser = new DOMParser()
    const tree = parser.parseFromString(template, 'text/html')
    const tpl = tree.querySelector<HTMLTemplateElement>('#general-tab-template')
    if (!tpl) return
    const content = tpl.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = sharedStyleCss + styleCss
    this.shadowRoot?.append(style, content)
    this.themeSelect = this.shadowRoot?.querySelector<UISelect>('#theme-select') || null
    this.languageSelect = this.shadowRoot?.querySelector<UISelect>('#language-select') || null
    this.closeAppToSystemTraySwitch =
      this.shadowRoot?.querySelector<UICheckbox>('#close-app-to-system-tray-switch') || null
  }

  private syncTheme(): void {
    if (!this.themeSelect) return
    const theme = this.config?.general.theme
    if (!theme) return
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
    } else {
      this.teardownSystemTheme()
      document.documentElement.classList.remove(theme)
    }
  }

  private changeTheme(): void {
    if (!this.themeSelect) return
    this.themeSelect.addEventListener('change', (e) => {
      const select = e.target as UISelect
      const value = select.value
      if (!value) return
      window.api?.config?.updateConfig({ general: { theme: value } }).catch(() => {})
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
        } else {
          this.teardownSystemTheme()
          // any other theme is a custom css class
          document.documentElement.classList.add(value)
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
    const lang = this.config?.general.language
    if (lang) {
      this.languageSelect.setAttribute('value', lang)
    }
  }

  private changeLanguage(): void {
    if (!this.languageSelect) return
    this.languageSelect.addEventListener('change', (e) => {
      const sel = e.target as UISelect
      const value = sel.value
      if (!value) return
      window.api?.config?.updateConfig({ general: { language: value } }).catch(() => {})
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

  private async syncCloseAppToSystemTray(): Promise<void> {
    if (!this.closeAppToSystemTraySwitch) return
    const useTray = this.config?.general.closeToTray
    this.closeAppToSystemTraySwitch.toggleAttribute('checked', useTray)
  }

  private changeCloseAppToSystemTray(): void {
    if (!this.closeAppToSystemTraySwitch) return
    this.closeAppToSystemTraySwitch.addEventListener('change', (e) => {
      const checkbox = e.target as UICheckbox
      const value = checkbox.checked
      window.api?.config?.updateConfig({ general: { closeToTray: value } }).catch(() => {})
    })
  }
}

customElements.define('general-tab-content', GeneralTab)
