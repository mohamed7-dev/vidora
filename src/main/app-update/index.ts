import { autoUpdater } from 'electron-updater'
import {
  onDownloadApproved,
  onDownloadProgress,
  onInstallApproved,
  onUpdateAvailable,
  onUpdateDownloaded,
  onUpdateError
} from './update-lib'
import { ipcMain } from 'electron'
import { EVENTS } from '../../shared/events'

autoUpdater.autoDownload = false

function checkForUpdate(): void {
  autoUpdater.removeAllListeners('update-available')
  autoUpdater.removeAllListeners('download-progress')
  autoUpdater.removeAllListeners('update-downloaded')
  autoUpdater.removeAllListeners('error')

  autoUpdater.on('update-available', onUpdateAvailable)
  autoUpdater.on('download-progress', onDownloadProgress)
  autoUpdater.on('update-downloaded', onUpdateDownloaded)
  autoUpdater.on('error', onUpdateError)

  autoUpdater.checkForUpdates()
}

function registerIPC(): void {
  // install approved
  ipcMain.handle(EVENTS.APP_UPDATE.INSTALL_APPROVAL_RESPONSE, onInstallApproved)

  // download approved
  ipcMain.handle(EVENTS.APP_UPDATE.DOWNLOAD_APPROVAL_RESPONSE, onDownloadApproved)

  // check update manually triggered
  ipcMain.on(EVENTS.APP_UPDATE.CHECK, () => {
    checkForUpdate()
  })
}

export function initAppUpdate(): void {
  checkForUpdate()
  registerIPC()
}
