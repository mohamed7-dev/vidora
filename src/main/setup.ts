import { checkFFmpeg } from './ffmpeg'
import { checkYtdlp } from './ytdlp'

/**
 * @description
 * This function sets up app internal such as yt-dlp and ffmpeg
 */
export async function setupAppInternals(): Promise<void> {
  await Promise.all([checkYtdlp(), checkFFmpeg()])
}
