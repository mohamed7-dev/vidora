import { initConfigCache, readConfig, updateConfig } from './config-api'
import { DeepPartial } from '../../shared/types'
import { initInternalConfigCache } from './internal-config-api'
import { ipcMain } from 'electron'
import { DEFAULT_CONFIG, InternalConfig } from './default-config'
import { APP_CONFIG_CHANNELS, AppConfig } from '../../shared/ipc/app-config'
import { broadcastToAllWindows } from '../lib'

/**
 * @description
 * This function registers the ipc listeners for config file.
 */
function registerConfigIpc(): void {
  ipcMain.handle(APP_CONFIG_CHANNELS.GET_APP_DEFAULTS, () => {
    return DEFAULT_CONFIG
  })

  // async (for invoke)
  ipcMain.handle(APP_CONFIG_CHANNELS.GET, () => {
    return readConfig()
  })

  // sync (for sendSync in preload)
  ipcMain.on(APP_CONFIG_CHANNELS.GET, (event) => {
    event.returnValue = readConfig()
  })

  ipcMain.handle(APP_CONFIG_CHANNELS.UPDATE, (_e, patch: DeepPartial<AppConfig>) => {
    const updated = updateConfig(patch)
    // broadcast updated config to all windows
    broadcastToAllWindows(APP_CONFIG_CHANNELS.UPDATED, updated)
    return updated
  })
}

/**
 * @description
 * Initialize user defined config, and the internal system configs.
 * This function runs synchronously
 */
export function initConfig(): { appConfig: AppConfig; internalConfig: InternalConfig } {
  // ensure user config file is setup, read it, and cache it
  const appConfig = initConfigCache()
  if (!appConfig) {
    throw new Error('Something went wrong while initializing app config')
  }
  // ensure app internal config file is setup, read it, and cache it
  const internalConfig = initInternalConfigCache()
  if (!internalConfig) {
    throw new Error('Something went wrong while initializing app config')
  }
  // register IPC for managing config file
  registerConfigIpc()
  return { appConfig, internalConfig }
}
