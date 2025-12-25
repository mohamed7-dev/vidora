import { BrowserWindow, dialog, ipcMain } from 'electron'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { readInternalConfig } from '../app-config/internal-config-api'
import { updateConfig } from '../app-config/config-api'
import { USER_PREF_CHANNELS } from '../../shared/ipc/user-pref'
import { complete, error } from './change-paths-status-bus'

/**
 * @description
 * This function registers the ipc listeners for config path change.
 */
function initChangeYtdlpConfigPathIpc(): void {
  ipcMain.on(USER_PREF_CHANNELS.YTDLP_FILE_PATH.CHANGE, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'] })
    if (result.canceled || result.filePaths.length === 0) {
      error(win, USER_PREF_CHANNELS.YTDLP_FILE_PATH.CHANGE_RESPONSE, {
        message: 'User canceled file selection',
        messageKey: 'status.configYtDlpFile.canceled',
        source: 'ytdlp-path',
        cause: 'User canceled file selection'
      })
      return
    }
    const picked = result.filePaths[0]

    const internalConfig = readInternalConfig()
    mkdirSync(internalConfig.configFolderPath, { recursive: true })
    const dest = join(internalConfig.configFolderPath, 'yt-dlp.conf')

    // Copy selected file to app config directory (overwrite if exists)
    try {
      copyFileSync(picked, dest)
    } catch (e) {
      console.error('Failed to copy yt-dlp config file:', e)
      error(win, USER_PREF_CHANNELS.YTDLP_FILE_PATH.CHANGE_RESPONSE, {
        message: 'Failed to copy yt-dlp config file',
        messageKey: 'status.configYtDlpFile.copy_failed',
        source: 'ytdlp-path',
        cause: e instanceof Error ? e.message : String(e)
      })
      return
    }

    updateConfig({ downloader: { configPath: dest } })
    complete(win, USER_PREF_CHANNELS.YTDLP_FILE_PATH.CHANGE_RESPONSE, {
      message: 'YtDlp config file changed successfully',
      messageKey: 'status.configYtDlpFile.ready',
      source: 'ytdlp-path'
    })
  })
}

/**
 * @description
 * This function initializes the ytdlp config file path.
 */
export function initYtdlpConfigPath(): void {
  initChangeYtdlpConfigPathIpc()
}
