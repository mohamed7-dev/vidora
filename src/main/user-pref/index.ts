import { AppConfig } from '../../shared/types'
import { initDownloadPath } from './download-path'
import { initYtdlpConfigPath } from './ytdlp-config-file-path'
import { initTray } from './tray'

/**
 * @description
 * This function initializes any IPC related to user preferences
 */
export async function initUserPref(appConfig: AppConfig): Promise<void> {
  initTray(appConfig.general.closeToTray)
  initDownloadPath(appConfig.downloads.downloadDir)
  initYtdlpConfigPath()
}
