import { ipcMain, BrowserWindow } from 'electron'
import { readConfig as readAppConfig, updateConfig } from './config-api'
import { EVENTS } from '../../shared/events'
import { DEFAULT_CONFIG } from './default-config'
import { AppConfig, DeepPartial } from '../../shared/types'

let cachedConfig: AppConfig | null = null

/**
 * @description
 * This function caches the config file in memory for faster access.
 */
export function initConfigCache(): void {
  try {
    cachedConfig = readAppConfig()
  } catch {
    cachedConfig = null
  }
}

/**
 * @description
 * This function registers the ipc listeners for config file.
 * it supports both sync and async calls.
 */
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
    cachedConfig = updated
    // broadcast updated config to all windows
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(EVENTS.CONFIG.UPDATED, updated))
    return updated
  })
}
