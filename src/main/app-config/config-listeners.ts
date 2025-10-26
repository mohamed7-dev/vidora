import { ipcMain } from 'electron'
import { readConfig as readAppConfig, updateConfig } from './config-api'
import { EVENTS } from '../../shared/events'
import { DEFAULT_CONFIG } from './default-config'
import { AppConfig, DeepPartial } from '../../shared/types'

export function registerConfigIpc(): void {
  ipcMain.handle(EVENTS.CONFIG.GET_APP_DEFAULTS, () => {
    return DEFAULT_CONFIG
  })

  ipcMain.handle(EVENTS.CONFIG.GET, () => {
    return readAppConfig()
  })

  ipcMain.handle(EVENTS.CONFIG.UPDATE, (_e, patch: DeepPartial<AppConfig>) => {
    const updated = updateConfig(patch)
    return updated
  })
}
