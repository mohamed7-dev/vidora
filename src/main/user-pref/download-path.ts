import { ipcMain, dialog, BrowserWindow } from 'electron'
import { mkdirSync, accessSync, statSync, writeFileSync, unlinkSync, constants } from 'node:fs'
import { join } from 'node:path'
import { updateConfig } from '../app-config/config-api'
import { AppConfig } from '../../shared/types'
import { USER_PREF_CHANNELS } from '../../shared/ipc/user-pref'
import { complete, error } from './change-paths-status-bus'

async function handleDownloadDirChange(
  event: Electron.IpcMainEvent,
  channel: string
): Promise<string | undefined> {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) {
    error(win, channel, {
      message: 'User canceled directory selection',
      messageKey: 'status.configDownloadDir.canceled',
      source: 'download-path'
    })
    return
  }
  const dir = result.filePaths[0]
  try {
    const st = statSync(dir)
    if (!st.isDirectory()) {
      error(win, channel, {
        message: 'Selected path is not a directory',
        messageKey: 'status.configDownloadDir.invalid',
        source: 'download-path'
      })
      return
    }
    // check writability by writing a temp file
    const probe = join(dir, `.write-test-${Date.now()}`)
    writeFileSync(probe, 'ok')
    unlinkSync(probe)
  } catch (e) {
    console.error('Download directory validation failed:', e)
    error(win, channel, {
      message: 'Download directory validation failed',
      messageKey: 'status.configDownloadDir.not_writable',
      source: 'download-path',
      cause: e instanceof Error ? e.message : String(e)
    })
    return
  }

  return dir
}

function checkDownloadDir(downloadDir: AppConfig['downloads']['downloadDir']): boolean {
  // make sure download dir is exists, and writable
  try {
    mkdirSync(downloadDir, { recursive: true })
    accessSync(downloadDir, constants.W_OK)
    return true
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Download directory validation failed')
  }
}

/**
 * @description
 * This function registers the ipc listeners for download path change.
 */
function initChangeDownloadPathIpc(): void {
  const globalChannel = USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_GLOBAL_RESPONSE
  ipcMain.on(USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_GLOBAL, async (event) => {
    // change download path globally
    const dir = await handleDownloadDirChange(event, globalChannel)
    if (!dir) return
    updateConfig({ downloads: { downloadDir: dir } })
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    complete(win, globalChannel, {
      message: 'Download directory changed successfully',
      messageKey: 'status.configDownloadDir.ready',
      source: 'download-path'
    })
  })

  const localChannel = USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_LOCAL_RESPONSE

  ipcMain.on(USER_PREF_CHANNELS.DOWNLOAD_PATH.CHANGE_LOCAL, async (event) => {
    // change download path on single download
    const dir = await handleDownloadDirChange(event, localChannel)
    if (!dir) return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    complete(win, localChannel, {
      message: 'Download directory changed successfully',
      messageKey: 'status.configDownloadDir.ready',
      source: 'download-path'
    })
  })
}

/**
 * @description
 * This function initializes download path option.
 */
export function initDownloadPath(dir: AppConfig['downloads']['downloadDir']): void {
  checkDownloadDir(dir)
  initChangeDownloadPathIpc()
}
