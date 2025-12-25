import { clipboard, contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { initTheme } from './theme'
import { type PreloadApi } from './types'
import { LoadedLocaleDictPayload, t } from '../shared/i18n'
import { initI18n } from './i18n'
import { APP_CONTROLS_CHANNELS } from '../shared/ipc/app-controls'
import { WINDOWS_CONTROLS_CHANNELS } from '../shared/ipc/window-controls'
import { MEDIA_INFO_CHANNELS, MediaInfoChannelPayload } from '../shared/ipc/get-media-info'
import { PASTE_LINK_CHANNELS } from '../shared/ipc/paste-link'
import { NAVIGATION_CHANNELS, SPANavigateChannelPayload } from '../shared/ipc/navigation'
import { APP_CONFIG_CHANNELS, AppConfig } from '../shared/ipc/app-config'
import { APP_UPDATE_CHANNELS, ApprovalRes } from '../shared/ipc/app-update'
import { DOWNLOAD_JOBS_CHANNELS, JobsUpdateEvent } from '../shared/ipc/download-jobs'
import { USER_PREF_CHANNELS } from '../shared/ipc/user-pref'

void initTheme()
void initI18n()

const api = {
  app: {
    relaunch: () => ipcRenderer.send(APP_CONTROLS_CHANNELS.RELAUNCH)
  },
  window: {
    minimize: () => ipcRenderer.send(WINDOWS_CONTROLS_CHANNELS.MINIMIZE),
    toggleMaximize: () => ipcRenderer.send(WINDOWS_CONTROLS_CHANNELS.MAXIMIZE),
    close: () => ipcRenderer.send(WINDOWS_CONTROLS_CHANNELS.CLOSE),
    reload: () => ipcRenderer.send(WINDOWS_CONTROLS_CHANNELS.RELOAD)
  },
  clipboard: {
    readText: async () => clipboard.readText(),
    writeText: async (text) => clipboard.writeText(text)
  },
  downloads: {
    getInfo: async (url) => ipcRenderer.invoke(MEDIA_INFO_CHANNELS.GET_INFO, url),
    onGettingInfo: (callback) => {
      const handler = (_e: unknown, payload: MediaInfoChannelPayload): void => callback(payload)
      ipcRenderer.on(MEDIA_INFO_CHANNELS.STATUS, handler)
      return () => ipcRenderer.removeListener(MEDIA_INFO_CHANNELS.STATUS, handler)
    }
  },
  pasteLink: {
    showMenu: () => ipcRenderer.send(PASTE_LINK_CHANNELS.SHOW_MENU),
    onPaste: (callback) => {
      const handler = (_e: unknown, text: string): void => callback(text)
      ipcRenderer.on(PASTE_LINK_CHANNELS.PASTED, handler)
      return () => ipcRenderer.removeListener(PASTE_LINK_CHANNELS.PASTED, handler)
    }
  },
  navigation: {
    navigate: (page) => {
      // Broadcast to the renderer world for SPA routing
      try {
        const ev = new CustomEvent<SPANavigateChannelPayload>(NAVIGATION_CHANNELS.TO, {
          detail: { page }
        })

        window.dispatchEvent(ev)
      } catch {
        void 0
      }
    }
  },
  config: {
    getAppDefaults: async () => ipcRenderer.invoke(APP_CONFIG_CHANNELS.GET_APP_DEFAULTS),
    getConfig: async () => ipcRenderer.invoke(APP_CONFIG_CHANNELS.GET),
    updateConfig: async (patch) => ipcRenderer.invoke(APP_CONFIG_CHANNELS.UPDATE, patch),
    onUpdated: (cb) => {
      const handler = (_: unknown, cfg: AppConfig): void => cb(cfg)
      ipcRenderer.on(APP_CONFIG_CHANNELS.UPDATED, handler)
      return () => ipcRenderer.removeListener(APP_CONFIG_CHANNELS.UPDATED, handler)
    }
  },
  preferences: {
    downloadPath: {
      changeLocal: () => ipcRenderer.send(USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_LOCAL),
      changedLocal: (callback) => {
        const handler = (_e: unknown, location: string): void => callback(location)
        ipcRenderer.on(USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_LOCAL_RESPONSE, handler)
        return () =>
          ipcRenderer.removeListener(
            USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_LOCAL_RESPONSE,
            handler
          )
      },
      changeGlobal: () => ipcRenderer.send(USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_GLOBAL),
      changedGlobal: (callback) => {
        const handler = (_e: unknown, location: string): void => callback(location)
        ipcRenderer.on(USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_GLOBAL_RESPONSE, handler)
        return () =>
          ipcRenderer.removeListener(
            USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_GLOBAL_RESPONSE,
            handler
          )
      }
    },
    ytdlpConfigPath: {
      change: () => ipcRenderer.send(USER_PREF_CHANNELS.YTDLP_FILE_PATH.CHANGE),
      changed: (callback) => {
        const handler = (_e: unknown, location: string): void => callback(location)
        ipcRenderer.on(USER_PREF_CHANNELS.YTDLP_FILE_PATH.CHANGE_RESPONSE, handler)
        return () =>
          ipcRenderer.removeListener(USER_PREF_CHANNELS.YTDLP_FILE_PATH.CHANGE_RESPONSE, handler)
      }
    }
  },
  i18n: {
    loadLocale: async (locale) => ipcRenderer.invoke(USER_PREF_CHANNELS.LOCALE.LOAD, locale),
    onLocaleChanged: (callback) => {
      const handler = (_e: Electron.IpcRendererEvent, info: LoadedLocaleDictPayload): void =>
        callback(info)
      ipcRenderer.on(USER_PREF_CHANNELS.LOCALE.LOADED, handler)
      return () => ipcRenderer.removeListener(USER_PREF_CHANNELS.LOCALE.LOADED, handler)
    },
    t: (phrase) => t(phrase)
  },
  downloadJobs: {
    add: async (payload) => ipcRenderer.invoke(DOWNLOAD_JOBS_CHANNELS.ADD, payload),
    list: async (params) => ipcRenderer.invoke(DOWNLOAD_JOBS_CHANNELS.LIST, params),
    updateStatus: async (id, status) =>
      ipcRenderer.invoke(DOWNLOAD_JOBS_CHANNELS.UPDATE_STATUS, id, status),
    remove: async (id: string) => ipcRenderer.invoke(DOWNLOAD_JOBS_CHANNELS.REMOVE, id),
    pause: async (id: string) => ipcRenderer.invoke(DOWNLOAD_JOBS_CHANNELS.PAUSE, id),
    resume: async (id: string) => ipcRenderer.invoke(DOWNLOAD_JOBS_CHANNELS.RESUME, id),
    onUpdated: (cb) => {
      const handler = (_: unknown, evt: JobsUpdateEvent): void => cb(evt)
      ipcRenderer.on(DOWNLOAD_JOBS_CHANNELS.STATUS_BUS, handler)
      return () => ipcRenderer.removeListener(DOWNLOAD_JOBS_CHANNELS.STATUS_BUS, handler)
    }
  },
  appUpdate: {
    respondToDownloadApproval: (res: ApprovalRes) =>
      ipcRenderer.invoke(APP_UPDATE_CHANNELS.RENDERER_TO_MAIN, res),
    respondToInstallApproval: (res: ApprovalRes) =>
      ipcRenderer.invoke(APP_UPDATE_CHANNELS.RENDERER_TO_MAIN, res)
    // add main to renderer listeners
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
