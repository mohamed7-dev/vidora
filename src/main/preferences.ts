import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { EVENTS } from '../shared/events'
import { DEFAULT_INTERNAL_CONFIG } from './app-config/default-config'
import { updateConfig } from './app-config/config-api'
import { begin, fail, success } from './status-bus'

export function handleChangeDownloadPath(): void {
  ipcMain.on(EVENTS.DOWNLOAD_PATH.CHANGE, async (event) => {
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
    updateConfig({ downloads: { downloadDir: dir } })
    win.webContents.send(EVENTS.DOWNLOAD_PATH.CHANGED, dir)
    success('configDownloadDir', 'status.configDownloadDir.ready')
  })
}

export function handleChangeConfigPath(): void {
  ipcMain.on(EVENTS.CONFIG_PATH.CHANGE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    // notify UI we started picking a config file
    begin('configYtDlp', 'status.configYtDlp.picking')
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'] })
    if (result.canceled || result.filePaths.length === 0) {
      fail('configYtDlp', 'User canceled file selection', 'status.configYtDlp.canceled')
      return
    }
    const picked = result.filePaths[0]

    fs.mkdirSync(DEFAULT_INTERNAL_CONFIG.configFolderPath, { recursive: true })
    const dest = path.join(DEFAULT_INTERNAL_CONFIG.configFolderPath, 'yt-dlp.conf')

    // Copy selected file to app config directory (overwrite if exists)
    try {
      fs.copyFileSync(picked, dest)
    } catch (e) {
      console.error('Failed to copy yt-dlp config file:', e)
      fail('configYtDlp', e, 'status.configYtDlp.copy_failed')
      return
    }

    updateConfig({ downloader: { configPath: dest } })

    win.webContents.send(EVENTS.CONFIG_PATH.CHANGED, dest)
    success('configYtDlp', 'status.configYtDlp.ready')
  })
}
