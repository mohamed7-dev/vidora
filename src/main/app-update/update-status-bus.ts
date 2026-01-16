import { APP_UPDATE_CHANNELS } from '../../shared/ipc/app-update'
import { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { broadcastToAllWindows } from '../lib'
import { t } from '../../shared/i18n/i18n'

const channel = APP_UPDATE_CHANNELS.MAIN_TO_RENDERER

export function sendCheckStarted(): void {
  broadcastToAllWindows(channel, {
    action: 'check-started',
    message: t`Checking for updates...`
  })
}

export function sendCheckResult(hasUpdate: boolean): void {
  broadcastToAllWindows(channel, {
    action: 'check-result',
    message: hasUpdate
      ? t`A new app update is available.`
      : t`You are already running the latest version.`,
    payload: {
      hasUpdate
    }
  })
}

export function sendUpdateAvailable(info: UpdateInfo): void {
  broadcastToAllWindows(channel, {
    action: 'download-available',
    message: t`A new version is ready to be downloaded, do you want to download it?`,
    payload: {
      updateInfo: info
    }
  })
}

export function sendApprovalSuccess(
  action: 'download-approval-success' | 'install-approval-success',
  message: string,
  payload?: { link: string }
): void {
  broadcastToAllWindows(
    APP_UPDATE_CHANNELS.MAIN_TO_RENDERER,
    action === 'download-approval-success'
      ? {
          action,
          message,
          payload: payload!
        }
      : {
          action,
          message
        }
  )
}

export function sendApprovalFail(
  action: 'download-approval-fail' | 'install-approval-fail',
  message: string,
  cause: string
): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action,
    message,
    payload: {
      cause
    }
  })
}

export function sendDownloadProgress(progressInfo: ProgressInfo): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'download-progress',
    message: t`Downloading new update is in progress`,
    payload: {
      progressInfo
    }
  })
}

export function sendDownloadedSuccessfully(info: UpdateDownloadedEvent): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'downloaded-successfully',
    message: t`A new update was downloaded successfully, do you want to install it?`,
    payload: {
      updateDownloadedInfo: info
    }
  })
}

export function sendInstalledSuccessfully(): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'installed-successfully',
    message: t`A new update was installed successfully`
  })
}

export function sendError(e: Error, message?: string): void {
  broadcastToAllWindows(APP_UPDATE_CHANNELS.MAIN_TO_RENDERER, {
    action: 'error',
    message: message ?? t`Something went wrong`,
    payload: {
      cause: e.message
    }
  })
}
