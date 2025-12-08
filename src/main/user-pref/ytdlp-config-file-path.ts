import { BrowserWindow, dialog, ipcMain } from 'electron'
import { EVENTS } from '../../shared/events'
import fs from 'node:fs'
import path from 'node:path'
import { readInternalConfig } from '../app-config/internal-config-api'
import { updateConfig } from '../app-config/config-api'

/**
 * @description
 * This function registers the ipc listeners for config path change.
 */
function initChangeYtdlpConfigPathIpc(): void {
  ipcMain.on(EVENTS.PREFERENCES.YTDLP_FILE_PATH.CHANGE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    // notify UI we started picking a config file
    // begin('configYtDlpFile', 'status.configYtDlpFile.picking')
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'] })
    if (result.canceled || result.filePaths.length === 0) {
      //   fail('configYtDlpFile', 'User canceled file selection', 'status.configYtDlpFile.canceled')
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
      //   fail('configYtDlpFile', e, 'status.configYtDlpFile.copy_failed')
      return
    }

    updateConfig({ downloader: { configPath: dest } })
    win.webContents.send(EVENTS.PREFERENCES.YTDLP_FILE_PATH.CHANGED, dest)
    // success('configYtDlpFile', 'status.configYtDlpFile.ready')
  })
}

/**
 * @description
 * This function initializes the ytdlp config file path.
 */
export function initYtdlpConfigPath(): void {
  initChangeYtdlpConfigPathIpc()
}
