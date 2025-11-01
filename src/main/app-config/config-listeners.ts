import { ipcMain, BrowserWindow } from 'electron'
import { readConfig as readAppConfig, updateConfig } from './config-api'
import { EVENTS } from '../../shared/events'
import { DEFAULT_CONFIG } from './default-config'
import { AppConfig, DeepPartial } from '../../shared/types'

let cachedConfig: AppConfig | null = null

export function initConfigCache(): void {
  try {
    cachedConfig = readAppConfig()
  } catch {
    cachedConfig = null
  }
}

export function registerConfigIpc(): void {
  ipcMain.handle(EVENTS.CONFIG.GET_APP_DEFAULTS, () => {
    return DEFAULT_CONFIG
  })

  // async (for invoke)
  ipcMain.handle(EVENTS.CONFIG.GET, () => {
    if (cachedConfig) return cachedConfig
    cachedConfig = readAppConfig()
    return cachedConfig
  })

  // sync (for sendSync in preload)
  ipcMain.on(EVENTS.CONFIG.GET, (event) => {
    if (cachedConfig) {
      event.returnValue = cachedConfig
      return
    }
    cachedConfig = readAppConfig()
    event.returnValue = cachedConfig
  })

  ipcMain.handle(EVENTS.CONFIG.UPDATE, (_e, patch: DeepPartial<AppConfig>) => {
    const updated = updateConfig(patch)
    // broadcast updated config to all windows
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(EVENTS.CONFIG.UPDATED, updated))
    return updated
  })
}
