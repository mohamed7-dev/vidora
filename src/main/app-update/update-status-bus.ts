import { BrowserWindow } from 'electron'
import { APP_UPDATE_CHANNELS, AppUpdateMainToRendererPayload } from '../../shared/ipc/app-update'
import { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'

const mainWindow = BrowserWindow.getAllWindows()[0]

export function sendUpdateAvailable(info: UpdateInfo): void {
  mainWindow?.webContents.send(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'download-available',
    message: 'A new version is ready to be downloaded, do you want to download it?',
    messageKey: 'appUpdate.download.beginMessage', // TODO: change this
    updateInfo: info
  } satisfies AppUpdateMainToRendererPayload)
}

export function sendApprovalSuccess(
  action: 'download-approval-success' | 'install-approval-success',
  message: string,
  messageKey: string,
  payload?: { link: string }
): void {
  mainWindow?.webContents.send(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action,
    message,
    messageKey,
    payload
  } satisfies AppUpdateMainToRendererPayload)
}

export function sendApprovalFail(
  action: 'download-approval-fail' | 'install-approval-fail',
  message: string,
  messageKey: string,
  cause: string
): void {
  mainWindow?.webContents.send(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action,
    message,
    messageKey,
    cause
  } satisfies AppUpdateMainToRendererPayload)
}

export function sendDownloadProgress(progressInfo: ProgressInfo): void {
  mainWindow?.webContents.send(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'download-progress',
    progressInfo,
    progress: progressInfo.percent,
    message: 'Downloading new update is in progress',
    messageKey: 'appUpdate.progress' // TODO: change this
  } satisfies AppUpdateMainToRendererPayload)
}

export function sendDownloadedSuccessfully(info: UpdateDownloadedEvent): void {
  mainWindow?.webContents.send(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'downloaded-successfully',
    message: 'A new update was downloaded successfully, do you want to install it?',
    messageKey: 'appUpdate.download.downloadedMessage', // TODO: change this
    updateDownloadedInfo: info
  } satisfies AppUpdateMainToRendererPayload)
}

export function sendInstalledSuccessfully(): void {
  mainWindow?.webContents.send(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'installed-successfully',
    message: 'A new update was installed successfully',
    messageKey: 'appUpdate.download.downloadedMessage' // TODO: change this
  } satisfies AppUpdateMainToRendererPayload)
}

export function sendError(e: Error, message?: string, messageKey?: string): void {
  mainWindow?.webContents.send(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'error',
    message: message ?? 'Unknown error',
    cause: e.message,
    messageKey: messageKey ?? 'appUpdate.download.downloadedMessage' // TODO: change this
  } satisfies AppUpdateMainToRendererPayload)
}
