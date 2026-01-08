import { setupMediaInfoIPC } from './get-media-info'
import { ensureYtDlpPath } from './check-ytdlp'
import { begin, complete, error, info, progress } from './check-ytlp-status-bus'
import { t } from '../../shared/i18n/i18n'
import { updateInternalConfig } from '../app-config/internal-config-api'

/**
 * @description
 * This function sets up yt-dlp
 */
export async function setupYtdlp(): Promise<void> {
  await ensureYtDlpPath({
    onBegin: () => {
      begin()
    },
    onInfo: (payload) => {
      const messages: Record<(typeof payload)['scope'], string> = {
        'macos-homebrew': t`yt-dlp is not installed. You can install it from Homebrew.`,
        'freebsd-bin-notfound': t`yt-dlp was not found on this system. Please install it before continuing.`,
        'updated-ytdlp': t`yt-dlp was updated successfully.`,
        'updating-ytdlp': t`yt-dlp is currently being updated…`
      }
      info({ message: messages[payload.scope], payload: { scope: payload.scope } })
    },
    onProgress: (payload) => {
      progress({
        message: t`Downloading ytdlp...`,
        payload: { progress: payload.progress }
      })
    },
    onError: (payload) => {
      const messages: Record<(typeof payload)['source'], string> = {
        env: t`The yt-dlp path from the environment is invalid or does not exist.`,
        'download-failure': t`Failed to download yt-dlp.`,
        'update-failure': t`Failed to update yt-dlp.`
      }
      error({
        message: messages[payload.source],
        payload: {
          source: payload.source,
          cause: payload.err instanceof Error ? payload.err.message : String(payload.err)
        }
      })
    },
    onComplete: (payload) => {
      complete({ payload: { finalYtdlpPath: payload.finalYtdlpPath } })
    }
  }).then((finalYtdlpPath) => {
    updateInternalConfig({ ytDlpPath: finalYtdlpPath })
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
