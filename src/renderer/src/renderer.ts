import { initRouter, navigate, normalizePath } from './lib/router'
import { UISonner } from './components/ui'
import { SPA_NAVIGATE_EVENT, SPANavigateEventDetailsPayload } from '@root/shared/navigate'

class App {
  private sonner: UISonner | null = null

  init(): void {
    void (async () => await this.syncHTMLLocale())()
    void (async () => await this.syncToolbarHeader())()
    this.initRouter()
    this.initSonner()
    this.initNetworkWatcher()
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
    window.addEventListener(SPA_NAVIGATE_EVENT, ((e: Event) => {
      const detail = (e as CustomEvent<SPANavigateEventDetailsPayload>).detail
      void navigate(normalizePath(detail.page))
    }) as EventListener)
  }

  private initSonner(): void {
    if (this.sonner) return
    const existing = document.querySelector('ui-sonner') as UISonner | null
    if (existing) {
      this.sonner = existing
      return
    }
    const el = document.createElement('ui-sonner') as UISonner
    document.body.appendChild(el)
    this.sonner = el
  }

  private initNetworkWatcher(): void {
    let lastOnline = navigator.onLine

    const update = (): void => {
      if (!this.sonner) return
      const online = navigator.onLine
      // Only react to actual transitions
      if (online === lastOnline) return
      lastOnline = online

      if (!online) {
        this.sonner.show({
          variant: 'destructive',
          title: 'You are offline',
          description: 'Some actions like fetching media info or downloading may fail.',
          duration: 0
        })
      } else {
        this.sonner.show({
          variant: 'default',
          title: 'Back online',
          description: 'Network connection restored.',
          duration: 3000
        })
      }
    }

    window.addEventListener('online', () => update())
    window.addEventListener('offline', () => update())
  }
}

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new App()
    app.init()
  })
}

void init()
