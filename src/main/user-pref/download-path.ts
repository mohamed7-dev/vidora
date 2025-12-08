import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { EVENTS } from '../../shared/events'
import { updateConfig } from '../app-config/config-api'
import { AppConfig } from '../../shared/types'

async function handleDownloadDirChange(event: Electron.IpcMainEvent): Promise<string | undefined> {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  //   begin('configDownloadDir', 'status.configDownloadDir.picking')
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) {
    // fail(
    //   'configDownloadDir',
    //   'User canceled directory selection',
    //   'status.configDownloadDir.canceled'
    // )
    return
  }
  const dir = result.filePaths[0]
  try {
    const st = fs.statSync(dir)
    if (!st.isDirectory()) {
      //   fail(
      //     'configDownloadDir',
      //     'Selected path is not a directory',
      //     'status.configDownloadDir.invalid'
      //   )
      return
    }
    // check writability by writing a temp file
    const probe = path.join(dir, `.write-test-${Date.now()}`)
    fs.writeFileSync(probe, 'ok')
    fs.unlinkSync(probe)
  } catch (e) {
    console.error('Download directory validation failed:', e)
    // fail('configDownloadDir', e, 'status.configDownloadDir.not_writable')
    return
  }
  //   success('configDownloadDir', 'status.configDownloadDir.ready')
  return dir
}

function checkDownloadDir(downloadDir: AppConfig['downloads']['downloadDir']): boolean {
  // make sure download dir is exists, and writable
  try {
    // ensure dir exists
    fs.mkdirSync(downloadDir, { recursive: true })
    fs.accessSync(downloadDir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }

  // TODO: deliver the state to the renderer
}

/**
 * @description
 * This function registers the ipc listeners for download path change.
 */
function initChangeDownloadPathIpc(): void {
  ipcMain.on(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGE_GLOBAL, async (event) => {
    // change download path globally
    const dir = await handleDownloadDirChange(event)
    if (!dir) return
    updateConfig({ downloads: { downloadDir: dir } })
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.webContents.send(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGED_GLOBAL, dir)
  })

  ipcMain.on(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGE_LOCAL, async (event) => {
    // change download path on single download
    const dir = await handleDownloadDirChange(event)
    if (!dir) return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.webContents.send(EVENTS.PREFERENCES.DOWNLOAD_PATH.CHANGED_LOCAL, dir)
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
