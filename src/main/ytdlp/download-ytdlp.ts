import { YtdlpEngine, type DownloadProgressPayload } from './ytdlp-engine'

export type ProgressCallbackPayload = DownloadProgressPayload

/**
 * @description
 * Downloads yt-dlp from github
 * @param path - path to download yt-dlp to
 * @param onProgress - optional callback to receive progress updates
 */
export async function downloadYtdlp(
  path: string,
  onProgress?: (payload: DownloadProgressPayload) => void
): Promise<void> {
  await YtdlpEngine.download(path, { onProgress })
}
