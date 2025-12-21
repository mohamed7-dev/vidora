import { setupMediaInfoIPC } from './get-media-info'
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
 * it registers handlers for getting media info, download, ...etc
 */
function handleYtdlpIPC(): void {
  setupMediaInfoIPC()
}

/**
 * @description
 * This function initializes ipc
 */
export async function initYtdlp(): Promise<void> {
  await setupYtdlp()
  handleYtdlpIPC()
}
