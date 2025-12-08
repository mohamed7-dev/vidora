import { autoUpdater, ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { DownloadAppUpdateApprovalRes, InstallAppUpdateApprovalRes } from '../../shared/app-update'
import { platform } from '@electron-toolkit/utils'
import { EXTERNAL_URLS } from '../constants'
import { shell } from 'electron'

export function onUpdateAvailable(info: UpdateInfo): void {
  // TODO: deliver info to the renderer
  //   begin(
  //     'appUpdate',
  //     'appUpdate.download.beginMessage',
  //     { ...info, scope: 'download' } as unknown as Record<string, string | number>,
  //     'A new version is ready to be downloaded, do you want to download it?'
  //   )
}

export function onUpdateDownloaded(info: UpdateDownloadedEvent): void {
  // TODO: deliver info to the renderer
  //   success(
  //     'appUpdate',
  //     'appUpdate.download.downloadedMessage',
  //     { scope: 'download' },
  //     'A new update was downloaded successfully.'
  //   )
  // listen to the response
  //   begin(
  //     'appUpdate',
  //     'appUpdate.install.beginMessage',
  //     { ...info, scope: 'install' } as unknown as Record<string, string | number>,
  //     'A new version is ready to be installed, do you want to install it?'
  //   )
}

export function onDownloadProgress(info: ProgressInfo): void {
  // TODO: deliver info to the renderer
  //   progress(
  //     'appUpdate',
  //     info.percent,
  //     'appUpdate.progress',
  //     { ...info, scope: 'download' } as unknown as Record<string, string | number>,
  //     'Downloading new update is in progress.'
  //   )
}

export function onUpdateError(e: Error, message?: string): void {
  // TODO: deliver message to the renderer
  //   fail('appUpdate', e, 'appUpdate.fail', undefined, message)
}

export function onInstallApproved(
  _e: Electron.IpcMainInvokeEvent,
  response: InstallAppUpdateApprovalRes
): void {
  if (response && response === 1) {
    autoUpdater.quitAndInstall()
    // TODO: deliver state to the render
    // success(
    //   'appUpdate',
    //   'appUpdate.install.approved',
    //   { scope: 'install' },
    //   'A new update was installed successfully.'
    // )
  } else {
    autoUpdater.autoInstallOnAppQuit = true
    // TODO: deliver state to the render

    // fail(
    //   'appUpdate',
    //   new Error('User cancelled installation.'),
    //   'appUpdate.install.cancelled',
    //   { scope: 'install' },
    //   'A new update is available and downloaded, but the user refused to perform the installation.'
    // )
  }
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
      //   success(
      //     'appUpdate',
      //     'appUpdate.download.approved.mac',
      //     { link, scope: 'download', subScope: 'approved-mac' },
      //     'Download can be started now, go and download the latest release from github.'
      //   )
    } else {
      // on other platforms, trigger download immediately
      autoUpdater.downloadUpdate()
      //   success(
      //     'appUpdate',
      //     'appUpdate.download.approved.others',
      //     { scope: 'download', subScope: 'approved-others' },
      //     'Download is started.'
      //   )
    }
  } else {
    // fail(
    //   'appUpdate',
    //   new Error('User cancelled download.'),
    //   'appUpdate.download.cancelled',
    //   { scope: 'download', subScope: 'cancelled' },
    //   'Latest version of the app is available, but the user refused to perform the update.'
    // )
  }
}
