import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EVENTS } from '../shared/events'
import { t } from './i18n'
import { AppConfig, DeepPartial } from '../shared/types'

const api = {
  window: {
    minimize: (): void => ipcRenderer.send(EVENTS.WINDOW.MINIMIZE),
    toggleMaximize: (): void => ipcRenderer.send(EVENTS.WINDOW.MAXIMIZE),
    close: (): void => ipcRenderer.send(EVENTS.WINDOW.CLOSE),
    reload: (): void => ipcRenderer.send(EVENTS.WINDOW.RELOAD)
  },
  navigation: {
    navigate: (page: string): void => ipcRenderer.send(EVENTS.NAVIGATE, page)
  },
  generalPreferences: {
    changeDownloadPath: (): void => ipcRenderer.send(EVENTS.DOWNLOAD_PATH.CHANGE),
    changedDownloadPath: (callback: (location: string) => void): void => {
      ipcRenderer.on(EVENTS.DOWNLOAD_PATH.CHANGED, (_event, location) => {
        callback(location)
      })
    }
  },
  config: {
    getAppDefaults: async (): Promise<AppConfig> =>
      ipcRenderer.invoke(EVENTS.CONFIG.GET_APP_DEFAULTS),
    getConfig: async (): Promise<AppConfig> => ipcRenderer.invoke(EVENTS.CONFIG.GET),
    updateConfig: async (patch: DeepPartial<AppConfig>): Promise<AppConfig> =>
      ipcRenderer.invoke(EVENTS.CONFIG.UPDATE, patch)
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
