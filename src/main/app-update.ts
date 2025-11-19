import { platform } from '@electron-toolkit/utils'
import { autoUpdater, ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'
import { begin, fail, progress, success } from './status-bus'
import { ipcMain, shell } from 'electron'
import { EVENTS } from '../shared/events'
import { EXTERNAL_URLS } from './constants'
import { DownloadAppUpdateApprovalRes, InstallAppUpdateApprovalRes } from '../shared/app-update'

autoUpdater.autoDownload = false

// listen to the response
ipcMain.handle(
  EVENTS.APP_UPDATE.DOWNLOAD_APPROVAL_RESPONSE,
  (_e, response: DownloadAppUpdateApprovalRes) => {
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
        success(
          'appUpdate',
          'appUpdate.download.approved.mac',
          { link, scope: 'download', subScope: 'approved-mac' },
          'Download can be started now, go and download the latest release from github.'
        )
      } else {
        // on other platforms, trigger download immediately
        autoUpdater.downloadUpdate()
        success(
          'appUpdate',
          'appUpdate.download.approved.others',
          { scope: 'download', subScope: 'approved-others' },
          'Download is started.'
        )
      }
    } else {
      fail(
        'appUpdate',
        new Error('User cancelled download.'),
        'appUpdate.download.cancelled',
        { scope: 'download', subScope: 'cancelled' },
        'Latest version of the app is available, but the user refused to perform the update.'
      )
    }
  }
)

ipcMain.on(EVENTS.APP_UPDATE.CHECK, () => {
  checkForUpdate()
})

function onUpdateAvailable(info: UpdateInfo): void {
  begin(
    'appUpdate',
    'appUpdate.download.beginMessage',
    { ...info, scope: 'download' } as unknown as Record<string, string | number>,
    'A new version is ready to be downloaded, do you want to download it?'
  )
}

function onUpdateDownloaded(info: UpdateDownloadedEvent): void {
  success(
    'appUpdate',
    'appUpdate.download.downloadedMessage',
    { scope: 'download' },
    'A new update was downloaded successfully.'
  )

  // listen to the response
  begin(
    'appUpdate',
    'appUpdate.install.beginMessage',
    { ...info, scope: 'install' } as unknown as Record<string, string | number>,
    'A new version is ready to be installed, do you want to install it?'
  )
}

function onDownloadProgress(info: ProgressInfo): void {
  progress(
    'appUpdate',
    info.percent,
    'appUpdate.progress',
    { ...info, scope: 'download' } as unknown as Record<string, string | number>,
    'Downloading new update is in progress.'
  )
}

function onUpdateError(e: Error, message?: string): void {
  fail('appUpdate', e, 'appUpdate.fail', undefined, message)
}

export function checkForUpdate(): void {
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

// listen to the response
ipcMain.handle(
  EVENTS.APP_UPDATE.INSTALL_APPROVAL_RESPONSE,
  (_e, response: InstallAppUpdateApprovalRes) => {
    if (response && response === 1) {
      autoUpdater.quitAndInstall()
      success(
        'appUpdate',
        'appUpdate.install.approved',
        { scope: 'install' },
        'A new update was installed successfully.'
      )
    } else {
      autoUpdater.autoInstallOnAppQuit = true
      fail(
        'appUpdate',
        new Error('User cancelled installation.'),
        'appUpdate.install.cancelled',
        { scope: 'install' },
        'A new update is available and downloaded, but the user refused to perform the installation.'
      )
    }
  }
)
