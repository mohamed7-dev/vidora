import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { EVENTS } from '../shared/events'
import { updateConfig } from './app-config/config-api'
import { begin, fail, success } from './status-bus'
import { readInternalConfig } from './app-config/internal-config-api'
import { initConfigCache } from './app-config/config-listeners'

const handleDownloadDirChange = async (
  event: Electron.IpcMainEvent
): Promise<string | undefined> => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  begin('configDownloadDir', 'status.configDownloadDir.picking')
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  if (result.canceled || result.filePaths.length === 0) {
    fail(
      'configDownloadDir',
      'User canceled directory selection',
      'status.configDownloadDir.canceled'
    )
    return
  }
  const dir = result.filePaths[0]
  try {
    const st = fs.statSync(dir)
    if (!st.isDirectory()) {
      fail(
        'configDownloadDir',
        'Selected path is not a directory',
        'status.configDownloadDir.invalid'
      )
      return
    }
    // check writability by writing a temp file
    const probe = path.join(dir, `.write-test-${Date.now()}`)
    fs.writeFileSync(probe, 'ok')
    fs.unlinkSync(probe)
  } catch (e) {
    console.error('Download directory validation failed:', e)
    fail('configDownloadDir', e, 'status.configDownloadDir.not_writable')
    return
  }
  success('configDownloadDir', 'status.configDownloadDir.ready')
  return dir
}
/**
 * @description
 * This function registers the ipc listeners for download path change.
 */
export function initChangeDownloadPathIpc(): void {
  ipcMain.on(EVENTS.DOWNLOAD_PATH.CHANGE, async (event) => {
    // change download path globally
    const dir = await handleDownloadDirChange(event)
    if (!dir) return
    updateConfig({ downloads: { downloadDir: dir } })
    // invalidate cache
    initConfigCache()
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.webContents.send(EVENTS.DOWNLOAD_PATH.CHANGED, dir)
  })

  ipcMain.on(EVENTS.MEDIA_DOWNLOAD_PATH.CHANGE, async (event) => {
    // change download path on single download
    const dir = await handleDownloadDirChange(event)
    if (!dir) return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    win.webContents.send(EVENTS.MEDIA_DOWNLOAD_PATH.CHANGED, dir)
  })
}

/**
 * @description
 * This function registers the ipc listeners for config path change.
 */
export function initChangeYtdlpConfigPathIpc(): void {
  ipcMain.on(EVENTS.CONFIG_PATH.CHANGE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    // notify UI we started picking a config file
    begin('configYtDlpFile', 'status.configYtDlpFile.picking')
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'] })
    if (result.canceled || result.filePaths.length === 0) {
      fail('configYtDlpFile', 'User canceled file selection', 'status.configYtDlpFile.canceled')
      return
    }
    const picked = result.filePaths[0]

    const internalConfig = readInternalConfig()
    fs.mkdirSync(internalConfig.configFolderPath, { recursive: true })
    const dest = path.join(internalConfig.configFolderPath, 'yt-dlp.conf')

    // Copy selected file to app config directory (overwrite if exists)
    try {
      fs.copyFileSync(picked, dest)
    } catch (e) {
      console.error('Failed to copy yt-dlp config file:', e)
      fail('configYtDlpFile', e, 'status.configYtDlpFile.copy_failed')
      return
    }

    updateConfig({ downloader: { configPath: dest } })
    // invalidate cache
    initConfigCache()
    win.webContents.send(EVENTS.CONFIG_PATH.CHANGED, dest)
    success('configYtDlpFile', 'status.configYtDlpFile.ready')
  })
}
