class App {
  private _unsubConfigUpdated: (() => void) | null = null
  init(): void {
    void (async () => await this.syncHTMLLocale())()
    this.syncTheme()
    void (async () => await this.syncToolbarHeader())()
    this.listenThemeChanges()
    window.addEventListener('beforeunload', () => {
      if (this._unsubConfigUpdated) this._unsubConfigUpdated()
      this._unsubConfigUpdated = null
    })
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
    const config = await window.api.config.getConfig()
    const theme = config?.general.theme
    const { applyThemeValue } = await import('./lib/theme')
    applyThemeValue(theme)
  }

  private listenThemeChanges(): void {
    this._unsubConfigUpdated = window.api.config.onUpdated((cfg) => {
      // Lazy import inside callback to avoid upfront cost
      import('./lib/theme').then(({ applyThemeValue }) => applyThemeValue(cfg.general.theme))
    })
  }

  private async syncToolbarHeader(): Promise<void> {
    const cfg = await window.api.config.getConfig()
    const useNative = Boolean(cfg?.general?.useNativeToolbar)
    if (!useNative) return
    const root = document.documentElement
    root.setAttribute('use-native-toolbar', 'true')
  }
}

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new App()
    app.init()
  })
}

void init()
