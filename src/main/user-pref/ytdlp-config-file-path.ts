import { BrowserWindow, dialog, ipcMain } from 'electron'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { readInternalConfig } from '../app-config/internal-config-api'
import { updateConfig } from '../app-config/config-api'
import { USER_PREF_CHANNELS } from '../../shared/ipc/user-pref'
import { complete, error } from './change-paths-status-bus'
import { t } from '../../shared/i18n/i18n'

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
        message: t`User canceled file selection`,
        payload: {
          source: 'ytdlp-path',
          cause: t`User canceled file selection`
        }
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
        message: t`Failed to copy yt-dlp config file`,
        payload: {
          source: 'ytdlp-path',
          cause: e instanceof Error ? e.message : String(e)
        }
      })
      return
    }

    updateConfig({ downloader: { configPath: dest } })
    complete(win, USER_PREF_CHANNELS.YTDLP_FILE_PATH.CHANGE_RESPONSE, {
      message: t`YtDlp config file changed successfully`,
      payload: {
        source: 'ytdlp-path',
        path: dest
      }
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
