import { APP_UPDATE_CHANNELS } from '../../shared/ipc/app-update'
import { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { broadcastToAllWindows } from '../lib'

const channel = APP_UPDATE_CHANNELS.MAIN_TO_RENDERER

export function sendUpdateAvailable(info: UpdateInfo): void {
  broadcastToAllWindows(channel, {
    action: 'download-available',
    message: 'A new version is ready to be downloaded, do you want to download it?',
    messageKey: 'appUpdate.download.beginMessage', // TODO: change this
    updateInfo: info
  })
}

export function sendApprovalSuccess(
  action: 'download-approval-success' | 'install-approval-success',
  message: string,
  messageKey: string,
  payload?: { link: string }
): void {
  broadcastToAllWindows(
    APP_UPDATE_CHANNELS.MAIN_TO_RENDERER,
    action === 'download-approval-success'
      ? {
          action,
          message,
          messageKey,
          payload: payload!
        }
      : {
          action,
          message,
          messageKey
        }
  )
}

export function sendApprovalFail(
  action: 'download-approval-fail' | 'install-approval-fail',
  message: string,
  messageKey: string,
  cause: string
): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action,
    message,
    messageKey,
    cause
  })
}

export function sendDownloadProgress(progressInfo: ProgressInfo): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'download-progress',
    progressInfo,
    message: 'Downloading new update is in progress',
    messageKey: 'appUpdate.progress' // TODO: change this
  })
}

export function sendDownloadedSuccessfully(info: UpdateDownloadedEvent): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'downloaded-successfully',
    message: 'A new update was downloaded successfully, do you want to install it?',
    messageKey: 'appUpdate.download.downloadedMessage', // TODO: change this
    updateDownloadedInfo: info
  })
}

export function sendInstalledSuccessfully(): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'installed-successfully',
    message: 'A new update was installed successfully',
    messageKey: 'appUpdate.download.downloadedMessage' // TODO: change this
  })
}

export function sendError(e: Error, message?: string, messageKey?: string): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'error',
    message: message ?? 'Unknown error',
    cause: e.message,
    messageKey: messageKey ?? 'appUpdate.download.downloadedMessage' // TODO: change this
  })
}
