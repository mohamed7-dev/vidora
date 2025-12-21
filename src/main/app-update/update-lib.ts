import { autoUpdater, ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { DownloadAppUpdateApprovalRes, InstallAppUpdateApprovalRes } from '../../shared/app-update'
import { platform } from '@electron-toolkit/utils'
import { EXTERNAL_URLS } from '../constants'
import { shell } from 'electron'
import {
  sendApprovalFail,
  sendApprovalSuccess,
  sendDownloadedSuccessfully,
  sendDownloadProgress,
  sendError,
  sendUpdateAvailable
} from './update-status-bus'

export function onUpdateAvailable(info: UpdateInfo): void {
  sendUpdateAvailable(info)
}

export function onDownloadApproved(
  _e: Electron.IpcMainInvokeEvent,
  response: DownloadAppUpdateApprovalRes
): void {
  if (response && response === 1) {
    if (platform.isMacOS) {
      // on mac os, let the user download the update manually
      let link = ''
      if (process.arch === 'x64') {
        link = EXTERNAL_URLS.latestReleaseMacX64
        shell.openExternal(EXTERNAL_URLS.latestReleaseMacX64)
      } else {
        link = EXTERNAL_URLS.latestReleaseMacArm64
        shell.openExternal(EXTERNAL_URLS.latestReleaseMacArm64)
      }
      sendApprovalSuccess(
        'download-approval-success',
        'Download can be started now, go and download the latest release from github',
        'appUpdate.download.approved.mac',
        { link }
      )
    } else {
      // on other platforms, trigger download immediately
      autoUpdater.downloadUpdate()
      sendApprovalSuccess(
        'download-approval-success',
        'Started downloading update',
        'appUpdate.download.approved.others'
      )
    }
  } else {
    sendApprovalFail(
      'download-approval-fail',
      'Latest version of the app is available, but the user refused to perform the update.',
      'appUpdate.download.cancelled',
      'Download was cancelled by the user'
    )
  }
}

export function onUpdateDownloaded(info: UpdateDownloadedEvent): void {
  sendDownloadedSuccessfully(info)
}

export function onDownloadProgress(info: ProgressInfo): void {
  sendDownloadProgress(info)
}

export function onUpdateError(e: Error): void {
  sendError(e)
}

export function onInstallApproved(
  _e: Electron.IpcMainInvokeEvent,
  response: InstallAppUpdateApprovalRes
): void {
  if (response && response === 1) {
    autoUpdater.quitAndInstall()
    sendApprovalSuccess(
      'install-approval-success',
      'A new update was installed successfully.',
      'appUpdate.install.approved'
    )
  } else {
    autoUpdater.autoInstallOnAppQuit = true
    sendApprovalFail(
      'install-approval-fail',
      'A new update is available and downloaded, but the user refused to perform the installation.',
      'appUpdate.install.cancelled',
      'User cancelled installation.'
    )
  }
}
