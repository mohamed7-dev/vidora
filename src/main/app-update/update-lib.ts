import { autoUpdater, ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
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
import { ApprovalRes } from '../../shared/ipc/app-update'
import { t } from '../../shared/i18n/i18n'

export function onUpdateAvailable(info: UpdateInfo): void {
  sendUpdateAvailable(info)
}

export function onDownloadApproved(_e: Electron.IpcMainInvokeEvent, response: ApprovalRes): void {
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
        t`Download can be started now, go and download the latest release from github`,
        { link }
      )
    } else {
      // on other platforms, trigger download immediately
      autoUpdater.downloadUpdate()
      sendApprovalSuccess('download-approval-success', t`Started downloading update`)
    }
  } else {
    sendApprovalFail(
      'download-approval-fail',
      t`Latest version of the app is available, but the user refused to perform the update.`,
      t`Download was cancelled by the user`
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

export function onInstallApproved(_e: Electron.IpcMainInvokeEvent, response: ApprovalRes): void {
  if (response && response === 1) {
    sendApprovalSuccess('install-approval-success', t`A new update was installed successfully.`)
    autoUpdater.quitAndInstall()
  } else {
    sendApprovalFail(
      'install-approval-fail',
      t`A new update is available and downloaded, but the user refused to perform the installation.`,
      t`User cancelled installation.`
    )
    autoUpdater.autoInstallOnAppQuit = true
  }
}
