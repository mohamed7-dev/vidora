import fs from 'node:fs'
import { readConfig } from './config-api'
import { useTray } from '../tray'
import { AppConfig } from '../../shared/types'
import { success, fail } from '../status-bus'
import { readInternalConfig } from './internal-config-api'
import { checkForUpdate } from '../app-update'

export type ConfigStatus = {
  downloadDir: {
    path: string
    writable: boolean
    reason?: string
  }
  tray: {
    isEnabled: boolean
  }
}

const isWritable = (dir: string): boolean => {
  try {
    // ensure dir exists
    fs.mkdirSync(dir, { recursive: true })
    fs.accessSync(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

const computeDownloadDirStatus = (
  downloadDir: AppConfig['downloads']['downloadDir']
): ConfigStatus['downloadDir'] => {
  // make sure download dir is exists, and writable
  const writable = isWritable(downloadDir)
  return {
    path: downloadDir,
    writable,
    reason: writable ? undefined : 'Default downloads path is not writable.'
  }
}

const computeTrayStatus = (
  closeToTray: AppConfig['general']['closeToTray']
): ConfigStatus['tray'] => ({
  isEnabled: Boolean(closeToTray)
})

const computeStatus = (config: AppConfig): ConfigStatus => ({
  downloadDir: computeDownloadDirStatus(config.downloads.downloadDir),
  tray: computeTrayStatus(config.general.closeToTray)
})

const syncTrayFromConfig = (closeToTray: AppConfig['general']['closeToTray']): void => {
  useTray(Boolean(closeToTray))
}

/**
 * @description
 * Initialize user personalizations, and the internal system configs.
 */
export const initConfig = (): void => {
  // ensure internal config file is setup, and read it
  readInternalConfig()
  // ensure user config file is setup, and read it
  const config = readConfig()
  // sync tray state in tray menu based on config option
  syncTrayFromConfig(config.general.closeToTray)
  // compute config status
  const status = computeStatus(config)

  // Publish status-bus entries
  if (status.downloadDir.writable) {
    success('configDownloadDir', 'status.config.downloadDir.writable', {
      path: status.downloadDir.path
    })
  } else {
    fail(
      'configDownloadDir',
      new Error(status.downloadDir.reason || 'Download directory not writable'),
      'status.config.downloadDir.notWritable',
      { path: status.downloadDir.path }
    )
  }
  success(
    'configTray',
    status.tray.isEnabled ? 'status.config.tray.enabled' : 'status.config.tray.disabled'
  )
  if (config.general.autoUpdate) {
    checkForUpdate()
  }
}
