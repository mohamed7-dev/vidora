import { ipcMain, dialog, BrowserWindow } from 'electron'
import { mkdirSync, accessSync, statSync, writeFileSync, unlinkSync, constants } from 'node:fs'
import { join } from 'node:path'
import { updateConfig } from '../app-config/config-api'
import { USER_PREF_CHANNELS } from '../../shared/ipc/user-pref'
import { complete, error } from './change-paths-status-bus'
import { AppConfig } from '../../shared/ipc/app-config'
import { t } from '../../shared/i18n/i18n'

async function handleDownloadDirChange(
  event: Electron.IpcMainEvent,
  channel: string
): Promise<string | undefined> {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) return // shouldn't error out when user cancels selection
  const dir = result.filePaths[0]
  try {
    const st = statSync(dir)
    if (!st.isDirectory()) {
      error(win, channel, {
        message: t`Selected path is not a directory`,
        payload: {
          source: 'download-path',
          cause: t`Selected path is not a directory`
        }
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
      message: t`Download directory validation failed`,
      payload: {
        source: 'download-path',
        cause: (e as Error).message ?? ''
      }
    })
    return
  }

  return dir
}

/**
 * @description
 * Checks Writability of the download directory at start up time, and throws
 * if not writable
 */
function checkDownloadDir(downloadDir: AppConfig['downloads']['downloadDir']): boolean {
  // make sure download dir is exists, and writable
  try {
    mkdirSync(downloadDir, { recursive: true })
    accessSync(downloadDir, constants.W_OK)
    return true
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : t`Download directory validation failed`)
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
      message: t`Download directory changed successfully`,
      payload: {
        source: 'download-path',
        path: dir
      }
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
      message: t`Download directory changed successfully`,
      payload: {
        source: 'download-path',
        path: dir
      }
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
