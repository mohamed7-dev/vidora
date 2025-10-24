import { storage } from './lib/storage'

class App {
  private _mql: MediaQueryList | null = null
  private _mqlHandler: ((e: MediaQueryListEvent) => void) | null = null

  init(): void {
    void (async () => await this.syncHTMLLocale())()
    this.syncTheme()
  }

  private async syncHTMLLocale(): Promise<void> {
    const locale = await window.api.i18n?.getLocale()
    if (!locale) return
    document.documentElement.lang = locale
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
  }

  private syncTheme(): void {
    let theme = storage.get('theme')
    if (!theme) theme = 'system'

    const apply = (isDark: boolean): void => {
      if (isDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }

    if (theme === 'system') {
      if (!this._mql) this._mql = window.matchMedia('(prefers-color-scheme: dark)')
      apply(this._mql.matches)
      if (!this._mqlHandler) {
        this._mqlHandler = (e: MediaQueryListEvent) => apply(e.matches)
        this._mql.addEventListener('change', this._mqlHandler)
      }
    } else {
      if (this._mql && this._mqlHandler) {
        this._mql.removeEventListener('change', this._mqlHandler)
      }
      this._mqlHandler = null
      if (theme === 'dark') apply(true)
      else apply(false)
    }
  }
}

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new App()
    app.init()
  })
}

init()
