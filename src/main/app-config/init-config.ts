import { initConfigCache, readConfig, updateConfig } from './config-api'
import { AppConfig, DeepPartial } from '../../shared/types'
import { initInternalConfigCache } from './internal-config-api'
import { BrowserWindow, ipcMain } from 'electron'
import { EVENTS } from '../../shared/events'
import { DEFAULT_CONFIG } from './default-config'

/**
 * @description
 * This function registers the ipc listeners for config file.
 */
function registerConfigIpc(): void {
  ipcMain.handle(EVENTS.CONFIG.GET_APP_DEFAULTS, () => {
    return DEFAULT_CONFIG
  })

  // async (for invoke)
  ipcMain.handle(EVENTS.CONFIG.GET, () => {
    return readConfig()
  })

  // sync (for sendSync in preload)
  ipcMain.on(EVENTS.CONFIG.GET, (event) => {
    event.returnValue = readConfig()
  })

  ipcMain.handle(EVENTS.CONFIG.UPDATE, (_e, patch: DeepPartial<AppConfig>) => {
    const updated = updateConfig(patch)
    // broadcast updated config to all windows
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(EVENTS.CONFIG.UPDATED, updated))
    return updated
  })
}

/**
 * @description
 * Initialize user defined config, and the internal system configs.
 * This function runs synchronously
 */
export function initConfig(): AppConfig {
  // ensure user config file is setup, read it, and cache it
  const appConfig = initConfigCache()
  if (!appConfig) {
    throw new Error('Something went wrong while initializing app')
  }
  // ensure app internal config file is setup, read it, and cache it
  initInternalConfigCache()
  // register IPC for managing config file
  registerConfigIpc()
  return appConfig
}
