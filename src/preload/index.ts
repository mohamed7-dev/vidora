import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { EVENTS } from '../shared/events'
import { getLocale, t } from './i18n'

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
  i18n: {
    getLocale: (): string => getLocale(),
    loadLocale: async (locale: string): Promise<Record<string, unknown>> =>
      ipcRenderer.invoke(EVENTS.I18N.LOAD_LOCALE, locale),
    setLocale: async (locale: string): Promise<void> =>
      ipcRenderer.invoke(EVENTS.I18N.SET_LOCALE, locale),
    onLocaleChanged: (callback: (locale: string) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, locale: string): void => callback(locale)
      ipcRenderer.on(EVENTS.I18N.LOCALE_CHANGED, handler)
      return () => ipcRenderer.removeListener(EVENTS.I18N.LOCALE_CHANGED, handler)
    },
    t: (phrase: string): string => t(phrase)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
