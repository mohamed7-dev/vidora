import { updateInternalConfig } from '../app-config/internal-config-api'
import { checkFFmpeg } from './check-ffmpeg'

/**
 * @description
 * This function sets up app internals such as yt-dlp and ffmpeg
 */
async function setupFFmpeg(): Promise<void> {
  await checkFFmpeg().then((ffmpegPath) => {
    if (ffmpegPath) updateInternalConfig({ ffmpegPath })
  })
}

export async function initFFmpeg(): Promise<void> {
  await setupFFmpeg()
}
