import { ipcMain } from 'electron'
import { EVENTS } from '../../shared/events'
import { getMediaInfo } from './get-media-info'
import { ensureYtDlpPath } from './check-ytdlp'
import { updateInternalConfig } from '../app-config/internal-config-api'

/**
 * @description
 * This function sets up yt-dlp
 */
export async function setupYtdlp(): Promise<void> {
  await ensureYtDlpPath().then((ytDlpPath) => {
    if (ytDlpPath) updateInternalConfig({ ytDlpPath })
  })
}

/**
 * @description
 * This function registers the ipc listeners for downloads.
 * it registers a handler for the get_info event.
 */
function handleYtdlpIPC(): void {
  ipcMain.handle(EVENTS.DOWNLOADS.GET_INFO, async (_e, url: string) => {
    if (!url || typeof url !== 'string') throw new Error('Invalid URL')
    const info = await getMediaInfo(url)
    return info
  })
}

/**
 * @description
 * This function initializes ipc
 */
export async function initYtdlp(): Promise<void> {
  await setupYtdlp()
  handleYtdlpIPC()
}
