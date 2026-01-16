import { autoUpdater } from 'electron-updater'
import {
  onDownloadApproved,
  onDownloadProgress,
  onInstallApproved,
  onUpdateAvailable,
  onUpdateDownloaded,
  onUpdateError,
  onUpdateNotAvailable
} from './update-lib'
import { ipcMain } from 'electron'
import { APP_UPDATE_CHANNELS, AppUpdateRendererToMainPayload } from '../../shared/ipc/app-update'
import { sendCheckStarted } from './update-status-bus'

autoUpdater.autoDownload = false

function checkForUpdate(): void {
  autoUpdater.removeAllListeners('update-available')
  autoUpdater.removeAllListeners('update-not-available')
  autoUpdater.removeAllListeners('download-progress')
  autoUpdater.removeAllListeners('update-downloaded')
  autoUpdater.removeAllListeners('error')

  autoUpdater.on('update-available', onUpdateAvailable)
  autoUpdater.on('update-not-available', onUpdateNotAvailable)
  autoUpdater.on('download-progress', onDownloadProgress)
  autoUpdater.on('update-downloaded', onUpdateDownloaded)
  autoUpdater.on('error', onUpdateError)

  sendCheckStarted()
  autoUpdater.checkForUpdates()
}

function registerIPC(): void {
  ipcMain.handle(
    APP_UPDATE_CHANNELS.RENDERER_TO_MAIN,
    (event, payload: AppUpdateRendererToMainPayload) => {
      if (payload.action === 'install-approval') {
        onInstallApproved(event, payload.approvalResponse)
      } else if (payload.action === 'download-approval') {
        onDownloadApproved(event, payload.approvalResponse)
      } else if (payload.action === 'check') {
        checkForUpdate()
      }
    }
  )
}

export function initAppUpdate(): void {
  checkForUpdate()
  registerIPC()
}
