import { clipboard, contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EVENTS } from '../shared/events'
import { AppConfig, DeepPartial } from '../shared/types'
import { DownloadJobPayload, Job, JobStatus, JobsUpdateEvent, ListJobsParams } from '../shared/jobs'
import { initTheme } from './theme'
import { DownloadAppUpdateApprovalRes, InstallAppUpdateApprovalRes } from '../shared/app-update'
import { type PreloadApi } from './types'
import { LoadedLocaleDictPayload, t } from '../shared/i18n'
import { initI18n } from './i18n'
import { SPA_NAVIGATE_EVENT, SPANavigateEventDetailsPayload } from '../shared/navigate'

void initTheme()
void initI18n()

const api = {
  app: {
    relaunch: (): void => ipcRenderer.send(EVENTS.APP.RELAUNCH)
  },
  downloads: {
    getInfo: async (url: string) => ipcRenderer.invoke(EVENTS.DOWNLOADS.GET_INFO, url)
  },
  pasteLink: {
    showMenu: (): void => ipcRenderer.send(EVENTS.PASTE_LINK.SHOW_MENU),
    onPaste: (callback: (text: string) => void): (() => void) => {
      const handler = (_e: unknown, text: string): void => callback(text)
      ipcRenderer.on(EVENTS.PASTE_LINK.PASTED, handler)
      return () => ipcRenderer.removeListener(EVENTS.PASTE_LINK.PASTED, handler)
    }
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
      // Broadcast to the renderer world for SPA routing
      try {
        const ev = new CustomEvent<SPANavigateEventDetailsPayload>(SPA_NAVIGATE_EVENT, {
          detail: { page }
        })

        window.dispatchEvent(ev)
      } catch {
        void 0
      }
    }
  },
  preferences: {
    downloadPath: {
      changeLocal: (): void => ipcRenderer.send(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGE_LOCAL),
      changedLocal: (callback: (location: string) => void): (() => void) => {
        const handler = (_e: unknown, location: string): void => callback(location)
        ipcRenderer.on(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGED_LOCAL, handler)
        return () =>
          ipcRenderer.removeListener(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGED_LOCAL, handler)
      },
      changeGlobal: (): void => ipcRenderer.send(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGE_GLOBAL),
      changedGlobal: (callback: (location: string) => void): (() => void) => {
        const handler = (_e: unknown, location: string): void => callback(location)
        ipcRenderer.on(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGED_GLOBAL, handler)
        return () =>
          ipcRenderer.removeListener(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGED_GLOBAL, handler)
      }
    },
    ytdlpConfigPath: {
      change: (): void => ipcRenderer.send(EVENTS.PREFERENCES.YTDLP_FILE_PATH.CHANGE),
      changed: (callback: (location: string) => void): (() => void) => {
        const handler = (_e: unknown, location: string): void => callback(location)
        ipcRenderer.on(EVENTS.PREFERENCES.YTDLP_FILE_PATH.CHANGED, handler)
        return () => ipcRenderer.removeListener(EVENTS.PREFERENCES.YTDLP_FILE_PATH.CHANGED, handler)
      }
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
      ipcRenderer.invoke(EVENTS.PREFERENCES.LOCALE.LOAD, locale),
    onLocaleChanged: (callback: (info: LoadedLocaleDictPayload) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, info: LoadedLocaleDictPayload): void =>
        callback(info)
      ipcRenderer.on(EVENTS.PREFERENCES.LOCALE.LOADED, handler)
      return () => ipcRenderer.removeListener(EVENTS.PREFERENCES.LOCALE.LOADED, handler)
    },
    t: (phrase: string): string => t(phrase)
  },
  // status: {
  //   getSnapshot: async (): Promise<import('../shared/status').StatusSnapshot> =>
  //     ipcRenderer.invoke(EVENTS.STATUS.SNAPSHOT),
  //   onUpdate: (cb: (snap: import('../shared/status').StatusSnapshot) => void): (() => void) => {
  //     const handler = (_: unknown, snap: import('../shared/status').StatusSnapshot): void =>
  //       cb(snap)
  //     ipcRenderer.on(EVENTS.STATUS.UPDATE, handler)
  //     return () => ipcRenderer.removeListener(EVENTS.STATUS.UPDATE, handler)
  //   }
  // },
  downloadJobs: {
    add: async (payload: DownloadJobPayload): Promise<Job> =>
      ipcRenderer.invoke(EVENTS.DOWNLOAD_JOBS.ADD, payload),
    list: async (params?: ListJobsParams): Promise<Job[]> =>
      ipcRenderer.invoke(EVENTS.DOWNLOAD_JOBS.LIST, params),
    updateStatus: async (id: string, status: JobStatus): Promise<Job | null> =>
      ipcRenderer.invoke(EVENTS.DOWNLOAD_JOBS.UPDATE_STATUS, id, status),
    remove: async (id: string): Promise<boolean> =>
      ipcRenderer.invoke(EVENTS.DOWNLOAD_JOBS.REMOVE, id),
    pause: async (id: string): Promise<Job | null> =>
      ipcRenderer.invoke(EVENTS.DOWNLOAD_JOBS.PAUSE, id),
    resume: async (id: string): Promise<Job | null> =>
      ipcRenderer.invoke(EVENTS.DOWNLOAD_JOBS.RESUME, id),
    onUpdated: (cb: (evt: JobsUpdateEvent) => void): (() => void) => {
      const handler = (_: unknown, evt: JobsUpdateEvent): void => cb(evt)
      ipcRenderer.on(EVENTS.DOWNLOAD_JOBS.UPDATED, handler)
      return () => ipcRenderer.removeListener(EVENTS.DOWNLOAD_JOBS.UPDATED, handler)
    }
  },
  appUpdate: {
    check: () => ipcRenderer.send(EVENTS.APP_UPDATE.CHECK),
    respondToDownloadApproval: (res: DownloadAppUpdateApprovalRes) =>
      ipcRenderer.invoke(EVENTS.APP_UPDATE.DOWNLOAD_APPROVAL_RESPONSE, res),
    respondToInstallApproval: (res: InstallAppUpdateApprovalRes) =>
      ipcRenderer.invoke(EVENTS.APP_UPDATE.INSTALL_APPROVAL_RESPONSE, res)
  }
} satisfies PreloadApi

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
