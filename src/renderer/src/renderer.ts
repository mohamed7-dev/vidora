class App {
  private _mql: MediaQueryList | null = null
  private _mqlHandler: ((e: MediaQueryListEvent) => void) | null = null

  init(): void {
    void (async () => await this.syncHTMLLocale())()
    this.syncTheme()
  }

  private async syncHTMLLocale(): Promise<void> {
    const config = await window.api.config.getConfig()
    const locale = config?.general.language
    const dir = config?.general.dir
    if (!locale || !dir) return
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }

  private async syncTheme(): Promise<void> {
    const apply = (isDark: boolean): void => {
      if (isDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
    const config = await window.api.config.getConfig()
    const theme = config?.general.theme
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
      else {
        if (theme !== 'light') {
          apply(true)
        }

        document.documentElement.classList.add(theme)
      }
    }
  }
}

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new App()
    app.init()
  })
}

void init()
