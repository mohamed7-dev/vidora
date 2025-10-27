import { clipboard, contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EVENTS } from '../shared/events'
import { t } from './i18n'
import { AppConfig, DeepPartial } from '../shared/types'

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
    navigate: (page: string): void => ipcRenderer.send(EVENTS.NAVIGATE, page)
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
