import fs from 'node:fs'
import { DEFAULT_CONFIG } from './default-config'
import { readConfig } from './config-api'
import { useTray } from '../tray'
import { AppConfig } from '../../shared/types'
import { success, fail } from '../status-bus'

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

const ensureDir = (dir: string): void => {
  fs.mkdirSync(dir, { recursive: true })
}

const isWritable = (dir: string): boolean => {
  try {
    ensureDir(dir)
    fs.accessSync(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

const computeDownloadDirStatus = (config: AppConfig): ConfigStatus['downloadDir'] => {
  const dir = config.downloads.downloadDir || DEFAULT_CONFIG.downloads.downloadDir
  const writable = isWritable(dir)
  return {
    path: dir,
    writable,
    reason: writable ? undefined : 'Default downloads path is not writable.'
  }
}

const computeTrayStatus = (config: AppConfig): ConfigStatus['tray'] => ({
  isEnabled: Boolean(config.general.closeToTray)
})

const computeStatus = (config: AppConfig): ConfigStatus => ({
  downloadDir: computeDownloadDirStatus(config),
  tray: computeTrayStatus(config)
})

const syncTrayFromConfig = (config: AppConfig): void => {
  useTray(Boolean(config.general.closeToTray))
}

export const initConfig = (): void => {
  const config = readConfig()
  const status = computeStatus(config)
  syncTrayFromConfig(config)
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
  // TODO: check settings for auto-update and start update if needed
}
