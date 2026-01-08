import './components/index'
import { initRouter, navigate, normalizePath } from './lib/router'
import { SPANavigateChannelPayload, NAVIGATION_CHANNELS } from '@root/shared/ipc/navigation'
import { APP_SCRIM_ACTIVE_ATTR, APP_SCRIM_EVENTS, FIRST_RUN_KEY } from './components/app-scrim'
import { toast } from './lib/sonner'

class App {
  private shellStarted = false
  private _linkPastedUnSub: (() => void) | null = null
  private _eventsAborter: AbortController | null = new AbortController()

  init(): void {
    if (!this._eventsAborter) this._eventsAborter = new AbortController()
    void (async () => await this.syncHTMLLocale())()
    void (async () => await this.syncToolbarHeader())()
    this.initScrimBootstrap()
    this.initSetupWatcher()
    this.initLinkPastedListener()
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
    const useNative = Boolean(cfg.general.useNativeToolbar)
    if (!useNative) return
    const root = document.documentElement
    root.setAttribute('use-native-toolbar', 'true')
  }

  private initScrimBootstrap(): void {
    try {
      const firstRunCompleted = window.localStorage.getItem(FIRST_RUN_KEY) === 'true'
      if (!firstRunCompleted) {
        document.body.append(document.createElement('app-scrim'))
        document.documentElement.setAttribute(APP_SCRIM_ACTIVE_ATTR, 'true')
      } else {
        this.initRouter()
      }
    } catch {
      // If storage is unavailable, fail open (no scrim bootstrap).
    }
  }

  /**
   * Start the main application shell (router + toasts) once setup is confirmed ready.
   * This is idempotent so it can safely be called multiple times.
   */
  private startAppShell(): void {
    if (this.shellStarted) return
    this.shellStarted = true
    this.initRouter()
  }

  /**
   * Listen to the app-setup status bus and start the shell when setup succeeds.
   * This keeps app-scrim purely visual and avoids coupling it to router logic.
   */
  private initSetupWatcher(): void {
    window.addEventListener(
      APP_SCRIM_EVENTS.APP_READY,
      () => {
        this.startAppShell()
      },
      { signal: this._eventsAborter?.signal }
    )
  }

  private initRouter(): void {
    initRouter()
    // Listen to preload-dispatched SPA navigation events
    window.addEventListener(NAVIGATION_CHANNELS.TO, ((e: Event) => {
      const detail = (e as CustomEvent<SPANavigateChannelPayload>).detail
      void navigate(normalizePath(detail.page))
    }) as EventListener)
  }

  private initLinkPastedListener(): void {
    if (this._linkPastedUnSub) this._linkPastedUnSub()
    this._linkPastedUnSub = window.api.pasteLink.onPaste((url) => {
      const newDialog = document.querySelector('new-dialog')
      if (!newDialog) return
      newDialog.openDialog()
      newDialog.focusInput()
      newDialog.mediaUrl = url
    })
  }

  private initNetworkWatcher(): void {
    let lastOnline = navigator.onLine

    const update = (): void => {
      const online = navigator.onLine
      // Only react to actual transitions
      if (online === lastOnline) return
      lastOnline = online

      if (!online) {
        toast.show({
          variant: 'destructive',
          title: window.api.i18n.t`You are offline`,
          description: window.api.i18n
            .t`Some actions like fetching media info or downloading may fail.`,
          duration: 0
        })
      } else {
        toast.show({
          variant: 'default',
          title: window.api.i18n.t`Back online`,
          description: window.api.i18n.t`Network connection restored.`,
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
