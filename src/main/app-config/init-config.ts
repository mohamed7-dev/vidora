import { app, BrowserWindow, ipcMain } from 'electron'
import fs from 'node:fs'
import { EVENTS } from '../../shared/events'
import { DEFAULT_CONFIG } from './default-config'
import { readConfig } from './config-api'
import { useTray } from '../tray'
import { AppConfig } from '../../shared/types'

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

const broadcastStatus = (status: ConfigStatus): void => {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(EVENTS.CONFIG.STATUS, status)
  })
}

const syncTrayFromConfig = (config: AppConfig): void => {
  useTray(Boolean(config.general.closeToTray))
}

export const initConfig = (): { getStatus: () => ConfigStatus } => {
  const config = readConfig()
  const status = computeStatus(config)
  syncTrayFromConfig(config)
  // TODO: check settings for auto-update and start update if needed

  // broadcast current status and for future windows
  broadcastStatus(status)
  app.on('browser-window-created', (_e, win) => {
    win.webContents.once('dom-ready', () => {
      win.webContents.send(EVENTS.CONFIG.STATUS, status)
    })
  })

  ipcMain.handle(EVENTS.CONFIG.GET_STATUS, () => status)

  return { getStatus: () => status }
}
