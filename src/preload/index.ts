import { clipboard, contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EVENTS } from '../shared/events'
import { t } from './i18n'
import { AppConfig, DeepPartial } from '../shared/types'
import { DownloadJobPayload } from '../shared/jobs'
import { applyInitialTheme, startThemeWatcher } from './theme'
import { DownloadAppUpdateApprovalRes, InstallAppUpdateApprovalRes } from '../shared/app-update'

applyInitialTheme()
startThemeWatcher()

const api = {
  app: {
    relaunch: (): void => ipcRenderer.send(EVENTS.APP.RELAUNCH)
  },
  downloads: {
    getInfo: async (url: string) => ipcRenderer.invoke(EVENTS.DOWNLOADS.GET_INFO, url)
  },
  clipboard: {
    readText: async (): Promise<string> => clipboard.readText(),
    writeText: async (text: string): Promise<void> => clipboard.writeText(text)
  },
  window: {
    minimize: (): void => ipcRenderer.send(EVENTS.WINDOW.MINIMIZE),
    toggleMaximize: (): void => ipcRenderer.send(EVENTS.WINDOW.MAXIMIZE),
    close: (): void => ipcRenderer.send(EVENTS.WINDOW.CLOSE),
    reload: (): void => ipcRenderer.send(EVENTS.WINDOW.RELOAD)
  },
  navigation: {
    navigate: (page: string): void => {
      // Broadcast to the renderer world for SPA routing (no full reload)
      try {
        const ev = new CustomEvent('spa:navigate', { detail: { page } })
        window.dispatchEvent(ev)
      } catch {
        void 0
      }
    }
  },
  downloadsPreferences: {
    changeDownloadPath: (): void => ipcRenderer.send(EVENTS.DOWNLOAD_PATH.CHANGE),
    changedDownloadPath: (callback: (location: string) => void): (() => void) => {
      const handler = (_e: unknown, location: string): void => callback(location)
      ipcRenderer.on(EVENTS.DOWNLOAD_PATH.CHANGED, handler)
      return () => ipcRenderer.removeListener(EVENTS.DOWNLOAD_PATH.CHANGED, handler)
    },
    changeYtdlpConfigPath: (): void => ipcRenderer.send(EVENTS.CONFIG_PATH.CHANGE),
    changedYtdlpConfigPath: (callback: (location: string) => void): (() => void) => {
      const handler = (_e: unknown, location: string): void => callback(location)
      ipcRenderer.on(EVENTS.CONFIG_PATH.CHANGED, handler)
      return () => ipcRenderer.removeListener(EVENTS.CONFIG_PATH.CHANGED, handler)
    }
  },
  /**
   * local changes when downloading media
   */
  mediaPreferences: {
    changeMediaDownloadPath: (): void => ipcRenderer.send(EVENTS.MEDIA_DOWNLOAD_PATH.CHANGE),
    changedMediaDownloadPath: (callback: (location: string) => void): (() => void) => {
      const handler = (_e: unknown, location: string): void => callback(location)
      ipcRenderer.on(EVENTS.MEDIA_DOWNLOAD_PATH.CHANGED, handler)
      return () => ipcRenderer.removeListener(EVENTS.MEDIA_DOWNLOAD_PATH.CHANGED, handler)
    }
  },
  config: {
    getAppDefaults: async (): Promise<AppConfig> =>
      ipcRenderer.invoke(EVENTS.CONFIG.GET_APP_DEFAULTS),
    getConfig: async (): Promise<AppConfig> => ipcRenderer.invoke(EVENTS.CONFIG.GET),
    updateConfig: async (patch: DeepPartial<AppConfig>): Promise<AppConfig> =>
      ipcRenderer.invoke(EVENTS.CONFIG.UPDATE, patch),
    onUpdated: (cb: (cfg: AppConfig) => void): (() => void) => {
      const handler = (_: unknown, cfg: AppConfig): void => cb(cfg)
      ipcRenderer.on(EVENTS.CONFIG.UPDATED, handler)
      return () => ipcRenderer.removeListener(EVENTS.CONFIG.UPDATED, handler)
    }
  },
  i18n: {
    loadLocale: async (locale: string): Promise<Record<string, unknown>> =>
      ipcRenderer.invoke(EVENTS.I18N.LOAD_LOCALE, locale),
    onLocaleChanged: (callback: (locale: string) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, locale: string): void => callback(locale)
      ipcRenderer.on(EVENTS.I18N.LOCALE_CHANGED, handler)
      return () => ipcRenderer.removeListener(EVENTS.I18N.LOCALE_CHANGED, handler)
    },
    t: (phrase: string): string => t(phrase)
  },
  status: {
    getSnapshot: async (): Promise<import('../shared/status').StatusSnapshot> =>
      ipcRenderer.invoke(EVENTS.STATUS.SNAPSHOT),
    onUpdate: (cb: (snap: import('../shared/status').StatusSnapshot) => void): (() => void) => {
      const handler = (_: unknown, snap: import('../shared/status').StatusSnapshot): void =>
        cb(snap)
      ipcRenderer.on(EVENTS.STATUS.UPDATE, handler)
      return () => ipcRenderer.removeListener(EVENTS.STATUS.UPDATE, handler)
    }
  },
  jobs: {
    add: async (payload: DownloadJobPayload): Promise<import('../shared/jobs').Job> =>
      ipcRenderer.invoke(EVENTS.JOBS.ADD, payload),
    list: async (
      params?: import('../shared/jobs').ListJobsParams
    ): Promise<import('../shared/jobs').Job[]> => ipcRenderer.invoke(EVENTS.JOBS.LIST, params),
    updateStatus: async (
      id: string,
      status: import('../shared/jobs').JobStatus
    ): Promise<import('../shared/jobs').Job | null> =>
      ipcRenderer.invoke(EVENTS.JOBS.UPDATE_STATUS, id, status),
    remove: async (id: string): Promise<boolean> => ipcRenderer.invoke(EVENTS.JOBS.REMOVE, id),
    pause: async (id: string): Promise<import('../shared/jobs').Job | null> =>
      ipcRenderer.invoke(EVENTS.JOBS.PAUSE, id),
    resume: async (id: string): Promise<import('../shared/jobs').Job | null> =>
      ipcRenderer.invoke(EVENTS.JOBS.RESUME, id),
    onUpdated: (cb: (evt: import('../shared/jobs').JobsUpdateEvent) => void): (() => void) => {
      const handler = (_: unknown, evt: import('../shared/jobs').JobsUpdateEvent): void => cb(evt)
      ipcRenderer.on(EVENTS.JOBS.UPDATED, handler)
      return () => ipcRenderer.removeListener(EVENTS.JOBS.UPDATED, handler)
    }
  },
  appUpdate: {
    respondToDownloadApproval: (res: DownloadAppUpdateApprovalRes) =>
      ipcRenderer.invoke(EVENTS.APP_UPDATE.DOWNLOAD_APPROVAL_RESPONSE, res),
    respondToInstallApproval: (res: InstallAppUpdateApprovalRes) =>
      ipcRenderer.invoke(EVENTS.APP_UPDATE.INSTALL_APPROVAL_RESPONSE, res)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
