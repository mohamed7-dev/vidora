import './components/index'
import { initRouter, navigate } from './lib/router'
import { SPANavigateChannelPayload, NAVIGATION_CHANNELS } from '@root/shared/ipc/navigation'
import { APP_SCRIM_ACTIVE_ATTR, APP_SCRIM_EVENTS, FIRST_RUN_KEY } from './components/app-scrim'
import { toast } from './lib/sonner'
import { upsertNotification } from './lib/notifications/api'
import { registerNotificationAction } from './lib/notifications/actions'
import type { AppUpdateMainToRendererPayload } from '@root/shared/ipc/app-update'
import type { CheckYtdlpChannelPayload } from '@root/shared/ipc/check-ytdlp'

class App {
  private shellStarted = false
  private _linkPastedUnSub: (() => void) | null = null
  private _eventsAborter: AbortController | null = new AbortController()
  private _unsubscribeAppUpdate: (() => void) | null = null
  private _unsubscribeYtdlpStatus: (() => void) | null = null
  private static readonly APP_UPDATE_NOTIFICATION_ID = 'app-update-notification'
  private static readonly YTDLP_UPDATE_NOTIFICATION_ID = 'ytdlp-update-notification'

  init(): void {
    if (!this._eventsAborter) this._eventsAborter = new AbortController()
    void (async () => await this.syncHTMLLocale())()
    void (async () => await this.syncToolbarHeader())()
    this.initScrimBootstrap()
    this.initSetupWatcher()
    this.initLinkPastedListener()
    this.initNetworkWatcher()
    this.initAppUpdateNotifications()
    this.initYtdlpUpdateNotifications()
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
      const page = (detail.page || '').trim()
      const path = page ? `/${page}` : '/'
      void navigate(path)
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

  private initAppUpdateNotifications(): void {
    if (!window.api?.appUpdate?.mainToRenderer) return

    // Register actions once
    registerNotificationAction('app-update-download-now', () => {
      window.api.appUpdate.rendererToMain({ action: 'download-approval', approvalResponse: 1 })
    })

    registerNotificationAction('app-update-download-later', () => {
      window.api.appUpdate.rendererToMain({ action: 'download-approval', approvalResponse: 0 })
    })

    registerNotificationAction('app-update-install-now', () => {
      window.api.appUpdate.rendererToMain({ action: 'install-approval', approvalResponse: 1 })
    })

    registerNotificationAction('app-update-install-later', () => {
      window.api.appUpdate.rendererToMain({ action: 'install-approval', approvalResponse: 0 })
    })

    registerNotificationAction('app-update-restart-now', () => {
      window.api.app.relaunch()
    })

    // Subscribe to main-> renderer app-update bus
    this._unsubscribeAppUpdate?.()
    this._unsubscribeAppUpdate = window.api.appUpdate.mainToRenderer((payload) => {
      void this._handleAppUpdateEvent(payload)
    })
  }

  private async _handleAppUpdateEvent(payload: AppUpdateMainToRendererPayload): Promise<void> {
    switch (payload.action) {
      case 'download-available': {
        await upsertNotification(App.APP_UPDATE_NOTIFICATION_ID, {
          title: window.api.i18n.t`Update available`,
          message: payload.message,
          actions: [
            { id: 'app-update-download-now', label: window.api.i18n.t`Download now` },
            { id: 'app-update-download-later', label: window.api.i18n.t`Later` }
          ]
        })
        break
      }
      case 'download-progress': {
        if (!payload.payload?.progressInfo) break
        {
          const percent = Math.round(payload.payload.progressInfo.percent ?? 0)
          const message = `${payload.message} (${percent}%)`
          await upsertNotification(App.APP_UPDATE_NOTIFICATION_ID, {
            title: window.api.i18n.t`Update downloading`,
            message
          })
        }
        break
      }
      case 'downloaded-successfully': {
        await upsertNotification(App.APP_UPDATE_NOTIFICATION_ID, {
          title: window.api.i18n.t`Update downloaded`,
          message: payload.message,
          actions: [
            { id: 'app-update-install-now', label: window.api.i18n.t`Install now` },
            { id: 'app-update-install-later', label: window.api.i18n.t`Later` }
          ]
        })
        break
      }
      case 'error': {
        await upsertNotification(App.APP_UPDATE_NOTIFICATION_ID, {
          title: window.api.i18n.t`Update error`,
          message: payload.message
        })
        break
      }
      default:
        break
    }
  }

  private initYtdlpUpdateNotifications(): void {
    if (!window.api?.ytdlp?.onCheckingStatus) return

    this._unsubscribeYtdlpStatus?.()
    this._unsubscribeYtdlpStatus = window.api.ytdlp.onCheckingStatus(
      (evt: CheckYtdlpChannelPayload) => {
        void this._handleYtdlpStatusEvent(evt)
      }
    )
  }

  private async _handleYtdlpStatusEvent(evt: CheckYtdlpChannelPayload): Promise<void> {
    if (evt.status !== 'info') return
    const scope = evt.payload?.scope

    if (scope === 'updating-ytdlp') {
      await upsertNotification(App.YTDLP_UPDATE_NOTIFICATION_ID, {
        title: window.api.i18n.t`Updating yt-dlp`,
        message: window.api.i18n.t`yt-dlp is being updated in the background.`
      })
    } else if (scope === 'updated-ytdlp') {
      await upsertNotification(App.YTDLP_UPDATE_NOTIFICATION_ID, {
        title: window.api.i18n.t`yt-dlp updated`,
        message: window.api.i18n.t`yt-dlp was updated successfully.`
      })
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
