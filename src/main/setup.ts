import { checkFFmpeg } from './ffmpeg'
import { ensureYtDlpPath } from './ytdlp'
import { updateInternalConfig } from './app-config/internal-config-api'

/**
 * @description
 * This function sets up app internals such as yt-dlp and ffmpeg
 */
export async function setupAppInternals(): Promise<void> {
  await Promise.all([
    ensureYtDlpPath().then((ytDlpPath) => {
      if (ytDlpPath) updateInternalConfig({ ytDlpPath })
    }),
    checkFFmpeg().then((ffmpegPath) => {
      if (ffmpegPath) updateInternalConfig({ ffmpegPath })
    })
  ])
}
