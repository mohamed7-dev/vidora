import { initRouter, navigate } from './lib/router'

class App {
  init(): void {
    void (async () => await this.syncHTMLLocale())()
    void (async () => await this.syncToolbarHeader())()
    this.initRouter()
  }

  private async syncHTMLLocale(): Promise<void> {
    const config = await window.api.config.getConfig()
    const locale = config?.general.language
    const dir = config?.general.dir
    if (!locale || !dir) return
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }

  private async syncToolbarHeader(): Promise<void> {
    const cfg = await window.api.config.getConfig()
    const useNative = Boolean(cfg?.general?.useNativeToolbar)
    if (!useNative) return
    const root = document.documentElement
    root.setAttribute('use-native-toolbar', 'true')
  }

  private initRouter(): void {
    initRouter()
    // Listen to preload-dispatched SPA navigation events
    window.addEventListener('spa:navigate', ((e: Event) => {
      const detail = (e as CustomEvent<{ page: string }>).detail
      const page = detail?.page
      const name = (page || '').trim().replace(/\.html$/i, '')
      const path = !name || name === 'index' || name === 'home' ? '/' : `/${name}`
      void navigate(path)
    }) as EventListener)
  }
}

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new App()
    app.init()
  })
}

void init()
